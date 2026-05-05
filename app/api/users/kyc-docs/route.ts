import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { selfieUrl, idPhotoUrl } = await req.json();
  if (!selfieUrl || !idPhotoUrl) {
    return NextResponse.json({ error: "Both selfie and ID photo are required." }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { selfieUrl, idPhotoUrl, idVerificationStatus: "pending" },
    select: { idVerificationStatus: true },
  });

  return NextResponse.json({ data: user });
}
