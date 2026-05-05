import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitReturnInspection } from "@/lib/services/booking.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const body = await req.json();
    const description: string = (body.description ?? "").trim();
    const photos: string[] = Array.isArray(body.photos) ? body.photos : [];
    const claimDeposit: boolean = body.claimDeposit === true;

    await submitReturnInspection(id, session.user.id, { description, photos, claimDeposit });
    return NextResponse.json({ data: { ok: true } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
  }
}
