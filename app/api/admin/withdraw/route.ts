import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { PAYSTACK_BASE_URL, paystackHeaders } from "@/lib/paystack";
import { createTransferRecipient } from "@/lib/paystack-transfers";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== "ADMIN") return null;
  return session;
}

async function getPaystackBalance(): Promise<number> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/balance`, { headers: paystackHeaders() });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message ?? "Failed to fetch Paystack balance");
  // Balance is in kobo (cents); convert to ZAR
  const zar = json.data?.find((b: any) => b.currency === "ZAR");
  return (zar?.balance ?? 0) / 100;
}

// GET — return Paystack balance + withdrawal history
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [balance, history] = await Promise.all([
    getPaystackBalance().catch(() => null),
    db.platformWithdrawal.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({ balance, history });
}

// POST — initiate a withdrawal of `amount` ZAR from the Paystack balance to the platform bank account
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bankAccount  = process.env.PLATFORM_BANK_ACCOUNT;
  const bankCode     = process.env.PLATFORM_BANK_CODE;
  const accountName  = process.env.PLATFORM_BANK_NAME ?? "LendMe Platform";

  if (!bankAccount || !bankCode) {
    return NextResponse.json(
      { error: "PLATFORM_BANK_ACCOUNT and PLATFORM_BANK_CODE must be set in environment variables" },
      { status: 503 }
    );
  }

  const { amount } = await req.json();
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  // Check there's enough balance
  let balance: number;
  try {
    balance = await getPaystackBalance();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  if (amount > balance) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: R${balance.toFixed(2)}` },
      { status: 400 }
    );
  }

  // Get or create a Paystack recipient for the platform bank account
  let recipientCode: string;
  try {
    const result = await createTransferRecipient({
      name:          accountName,
      accountNumber: bankAccount,
      bankCode,
    });
    recipientCode = result.recipientCode;
  } catch (err: any) {
    return NextResponse.json({ error: `Paystack recipient error: ${err.message}` }, { status: 502 });
  }

  // Create a pending withdrawal record first for idempotency
  const withdrawal = await db.platformWithdrawal.create({
    data: { amount, status: "PENDING" },
  });

  // Initiate the transfer
  const transferRes = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      source:    "balance",
      amount:    Math.round(amount * 100), // kobo
      recipient: recipientCode,
      reason:    `LendMe platform withdrawal ${new Date().toISOString().slice(0, 10)}`,
      reference: withdrawal.id,
    }),
  });

  const transferJson = await transferRes.json();

  if (!transferRes.ok || !transferJson.status) {
    await db.platformWithdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: transferJson.message ?? "Paystack transfer failed" },
      { status: 502 }
    );
  }

  const ref = transferJson.data?.transfer_code ?? withdrawal.id;
  await db.platformWithdrawal.update({
    where: { id: withdrawal.id },
    data: { status: "SUCCESS", paystackRef: ref },
  });

  return NextResponse.json({ withdrawal: { ...withdrawal, status: "SUCCESS", paystackRef: ref } });
}
