import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRentalPaymentIntent } from "@/lib/services/payments.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const { clientSecret, depositClientSecret } = await createRentalPaymentIntent(
      bookingId,
      session.user.id
    );

    return NextResponse.json({ data: { clientSecret, depositClientSecret } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create payment intent" },
      { status: 400 }
    );
  }
}
