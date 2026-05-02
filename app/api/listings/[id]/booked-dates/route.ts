import { NextRequest, NextResponse } from "next/server";
import { getBookedDateRanges } from "@/lib/services/booking.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ranges = await getBookedDateRanges(id);
    return NextResponse.json({ data: ranges });
  } catch {
    return NextResponse.json({ error: "Failed to fetch booked dates" }, { status: 500 });
  }
}
