import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitIssues } from "@/lib/services/booking.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    const result = await submitIssues(id, session.user.id);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
  }
}
