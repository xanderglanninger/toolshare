import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initiateHandover } from "@/lib/services/booking.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { pickupLocation, agreedHandoverTime } = body;

    const result = await initiateHandover(id, session.user.id, {
      pickupLocation: pickupLocation ?? "",
      agreedHandoverTime: agreedHandoverTime ? new Date(agreedHandoverTime) : new Date(0),
    });
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
  }
}
