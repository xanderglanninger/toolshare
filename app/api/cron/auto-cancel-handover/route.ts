import { NextRequest, NextResponse } from "next/server";
import { autoExpireHandoverBookings } from "@/lib/services/booking.service";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await autoExpireHandoverBookings();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[cron/auto-cancel-handover]", error);
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }
}
