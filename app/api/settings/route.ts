import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, surname: true, email: true, image: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ data: user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "update_profile") {
    const { name, surname } = body;
    if (!name?.trim() || !surname?.trim()) {
      return NextResponse.json({ error: "Name and surname are required." }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { name: name.trim(), surname: surname.trim() },
      select: { id: true, name: true, surname: true, email: true },
    });

    return NextResponse.json({ data: updated });
  }

  if (action === "change_password") {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All password fields are required." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (!user.password) return NextResponse.json({ error: "Password login not available for this account." }, { status: 400 });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: session.user.id }, data: { password: hashed } });

    return NextResponse.json({ data: { success: true } });
  }

  if (action === "update_profile_image") {
    const { imageUrl } = body;
    if (!imageUrl?.trim()) {
      return NextResponse.json({ error: "Image URL required." }, { status: 400 });
    }
    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl.trim() },
      select: { id: true, image: true },
    });
    return NextResponse.json({ data: updated });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
