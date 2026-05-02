import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "@/lib/services/notification.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(session.user.id),
      getUnreadCount(session.user.id),
    ]);

    return NextResponse.json({ data: { notifications, unreadCount } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = body.ids;

    await markNotificationsRead(session.user.id, ids);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}
