import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

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
    },
  });

  return NextResponse.json({ data: user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bankAccountHolder, bankName, bankAccountNumber, bankAccountType, bankBranchCode } =
    await req.json();

  if (!bankAccountHolder || !bankName || !bankAccountNumber || !bankAccountType) {
    return NextResponse.json({ error: "All bank account fields are required" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { bankAccountHolder, bankName, bankAccountNumber, bankAccountType, bankBranchCode: bankBranchCode ?? null },
    select: {
      bankAccountHolder: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountType: true,
      bankBranchCode: true,
    },
  });

  return NextResponse.json({ data: user });
}
