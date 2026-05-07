import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  PAYFAST_BASE_URL,
  PAYFAST_MERCHANT_ID,
  PAYFAST_MERCHANT_KEY,
  PAYFAST_PASSPHRASE,
  buildSignature,
  isPayFastConfigured,
} from "@/lib/payfast";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPayFastConfigured()) {
    return NextResponse.json({ error: "PayFast is not configured" }, { status: 503 });
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

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.borrowerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!forDeposit && booking.status !== "PENDING") {
    return NextResponse.json({ error: "Booking is not pending payment" }, { status: 400 });
  }

  // Fetch borrower details including email
  const borrower = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, surname: true, email: true },
  });

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const amount = forDeposit
    ? (booking.depositAmount ?? 0)
    : booking.totalAmount;

  const mPaymentId = forDeposit ? `${bookingId}-deposit` : bookingId;

  const itemName = forDeposit
    ? `Deposit: ${booking.listing.title}`.slice(0, 100)
    : `Rental: ${booking.listing.title}`.slice(0, 100);

  // Create Payment record if it doesn't exist yet (PayFast rental payment)
  if (!forDeposit && !booking.payment) {
    await db.payment.create({
      data: {
        bookingId,
        amount: booking.totalAmount,
        currency: "ZAR",
        status: "PENDING",
        provider: "PAYFAST",
        escrowStatus: "HELD",
        depositStatus: (booking.depositAmount ?? 0) > 0 ? "HELD" : "WAIVED",
      },
    });
  }

  const nameParts = [borrower?.name ?? "", borrower?.surname ?? ""].filter(Boolean);
  const firstName = nameParts[0] ?? "User";
  const lastName = nameParts[1] ?? firstName;

  // Build PayFast params in the required order — omit empty strings so
  // the signature and the form fields always match exactly.
  const rawParams: Record<string, string> = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: `${baseUrl}/payment/${bookingId}?provider=payfast&type=${forDeposit ? "deposit" : "rental"}`,
    cancel_url: `${baseUrl}/payment/${bookingId}?provider=payfast&cancelled=true`,
    notify_url: `${baseUrl}/api/webhooks/payfast`,
    name_first: firstName,
    name_last: lastName,
    email_address: borrower?.email ?? "",
    m_payment_id: mPaymentId,
    amount: amount.toFixed(2),
    item_name: itemName,
    custom_str1: bookingId,
    custom_str2: forDeposit ? "deposit" : "rental",
  };

  // Strip empty values — PayFast signature must match the fields actually sent
  const params = Object.fromEntries(
    Object.entries(rawParams).filter(([, v]) => v.trim() !== "")
  );

  const signature = buildSignature(params, PAYFAST_PASSPHRASE);
  const finalParams = { ...params, signature };

  return NextResponse.json({ data: { params: finalParams, url: PAYFAST_BASE_URL } });
}
