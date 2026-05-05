import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acknowledgeReturn } from "@/lib/services/booking.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const body = await req.json();
    const dispute: boolean = body.dispute === true;

    await acknowledgeReturn(id, session.user.id, dispute);
    return NextResponse.json({ data: { ok: true } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
  }
}
