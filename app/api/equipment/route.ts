import { NextRequest, NextResponse } from "next/server";
import { listEquipment, createEquipment } from "@/lib/services/equipment.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? undefined;
    const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
    const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;

    const equipment = await listEquipment({ category, lat, lng });
    return NextResponse.json({ data: equipment });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // TODO: extract ownerId from session (NextAuth / Clerk)
    const ownerId = body.ownerId;
    const equipment = await createEquipment(ownerId, body);
    return NextResponse.json({ data: equipment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 });
  }
}
