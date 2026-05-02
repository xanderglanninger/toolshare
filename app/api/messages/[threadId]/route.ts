import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getThreadMessages, sendMessage } from "@/lib/services/messaging.service";
import { createNotification } from "@/lib/services/notification.service";
import { db } from "@/lib/db/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const messages = await getThreadMessages(threadId, session.user.id);
    return NextResponse.json({ data: messages });
  } catch (error: any) {
    const status = error?.message === "Not a participant in this thread" ? 403 : 500;
    return NextResponse.json({ error: error?.message ?? "Failed to fetch messages" }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const { body } = await req.json();

    if (!body?.trim()) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const message = await sendMessage(threadId, session.user.id, body.trim());

    // Notify other thread participants of new message
    const thread = await db.messageThread.findUnique({
      where: { id: threadId },
      include: {
        participants: { select: { userId: true } },
        booking: { select: { listing: { select: { title: true } } } },
      },
    });
    const senderName = session.user?.name ?? "Someone";
    const subject = thread?.booking?.listing?.title ?? "a conversation";
    const senderId = session.user?.id;
    const recipients = thread?.participants
      .map((p) => p.userId)
      .filter((uid) => uid !== senderId) ?? [];

    for (const userId of recipients) {
      createNotification({
        userId,
        type: "NEW_MESSAGE",
        title: "New Message",
        body: `${senderName} sent you a message about "${subject}"`,
        tab: "messages",
        linkData: threadId,
      }).catch(() => {});
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error: any) {
    const status = error?.message === "Not a participant in this thread" ? 403 : 500;
    return NextResponse.json({ error: error?.message ?? "Failed to send message" }, { status });
  }
}
