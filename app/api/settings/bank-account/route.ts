import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { createTransferRecipient } from "@/lib/paystack-transfers";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      bankAccountHolder: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountType: true,
      bankBranchCode: true,
      paystackRecipientCode: true,
    },
  });

  return NextResponse.json({
    data: {
      bankAccountHolder:    user?.bankAccountHolder    ?? null,
      bankName:             user?.bankName             ?? null,
      bankAccountNumber:    user?.bankAccountNumber    ?? null,
      bankAccountType:      user?.bankAccountType      ?? null,
      bankBranchCode:       user?.bankBranchCode       ?? null,
      hasPayoutAccount:     !!user?.paystackRecipientCode,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bankAccountHolder, bankName, bankAccountNumber, bankAccountType, bankBranchCode } =
    await req.json();

  if (!bankAccountHolder || !bankName || !bankAccountNumber || !bankAccountType || !bankBranchCode) {
    return NextResponse.json({ error: "All bank account fields are required" }, { status: 400 });
  }

  // Register (or re-register) the lender as a Paystack transfer recipient.
  let paystackRecipientCode: string;
  try {
    const result = await createTransferRecipient({
      name:          bankAccountHolder,
      accountNumber: bankAccountNumber,
      bankCode:      bankBranchCode,
    });
    paystackRecipientCode = result.recipientCode;
  } catch (err: any) {
    console.error("[bank-account] Paystack recipient creation failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not register bank account with Paystack" },
      { status: 502 }
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      bankAccountType,
      bankBranchCode,
      paystackRecipientCode,
    },
  });

  return NextResponse.json({ data: { hasPayoutAccount: true } });
}
