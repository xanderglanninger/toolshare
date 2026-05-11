import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: "Paystack is not configured" }, { status: 503 });
  }

  const body = await req.json();
  const bookingId: string = body.bookingId;
  const forDeposit: boolean = body.forDeposit === true;

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true } },
      payment: true,
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.borrowerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!forDeposit && booking.status !== "PENDING") {
    return NextResponse.json({ error: "Booking is not pending payment" }, { status: 400 });
  }

  const borrower = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!borrower?.email) {
    return NextResponse.json({ error: "User email not found" }, { status: 400 });
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const amount = forDeposit ? (booking.depositAmount ?? 0) : booking.totalAmount;
  const type = forDeposit ? "deposit" : "rental";

  // Unique reference per transaction attempt
  const reference = `${bookingId}-${type}-${nanoid(8)}`;

  // Create Payment record for rental payments
  if (!forDeposit && !booking.payment) {
    await db.payment.create({
      data: {
        bookingId,
        amount: booking.totalAmount,
        currency: "ZAR",
        status: "PENDING",
        provider: "PAYSTACK",
        escrowStatus: "HELD",
        depositStatus: (booking.depositAmount ?? 0) > 0 ? "HELD" : "WAIVED",
        paymentReference: reference,
      },
    });
  }

  try {
    const txn = await initializeTransaction({
      email: borrower.email,
      amount,
      reference,
      callback_url: `${baseUrl}/payment/${bookingId}?provider=paystack&type=${type}`,
      metadata: {
        bookingId,
        type,
        custom_fields: [
          { display_name: "Booking ID", variable_name: "bookingId", value: bookingId },
          { display_name: "Type", variable_name: "type", value: type },
        ],
      },
    });

    console.log("[Paystack] initialized transaction:", reference, "| amount:", amount);

    return NextResponse.json({ data: { authorization_url: txn.authorization_url, reference: txn.reference } });
  } catch (err: any) {
    console.error("[Paystack] initializeTransaction failed:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Failed to initialize Paystack transaction" }, { status: 502 });
  }
}
