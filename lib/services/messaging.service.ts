import { db } from "@/lib/db/client";
import type { Message, MessageThread } from "@/lib/types";

const participantInclude = {
  user: { select: { id: true, name: true, surname: true, image: true } },
};

const messageInclude = {
  sender: { select: { id: true, name: true, surname: true, image: true } },
};

const bookingInclude = {
  select: {
    id: true,
    startDate: true,
    endDate: true,
    totalAmount: true,
    depositAmount: true,
    status: true,
    listing: {
      select: {
        id: true,
        title: true,
        images: true,
        category: true,
        city: true,
        province: true,
        pricePerDay: true,
      },
    },
  },
};

export async function getThreadsByUser(userId: string): Promise<MessageThread[]> {
  const threads = await db.messageThread.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    include: {
      participants: { include: participantInclude },
      booking: bookingInclude,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: messageInclude,
      },
    },
  });

  return threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    bookingId: t.bookingId,
    bookingInfo: t.booking ?? null,
    participants: t.participants,
    lastMessage: t.messages[0] ?? null,
    lastMessageAt: t.lastMessageAt,
    unreadCount: t.messages.filter((m) => m.senderId !== userId && !m.readAt).length,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  })) as MessageThread[];
}

export async function getOrCreateThread({
  bookingId,
  participantIds,
  subject,
}: {
  bookingId: string;
  participantIds: [string, string];
  subject?: string;
}): Promise<{ threadId: string; isNew: boolean }> {
  const existing = await db.messageThread.findUnique({
    where: { bookingId },
    select: { id: true },
  });

  if (existing) return { threadId: existing.id, isNew: false };

  const thread = await db.messageThread.create({
    data: {
      bookingId,
      subject: subject ?? null,
      participants: {
        create: participantIds.map((userId) => ({ userId })),
      },
    },
    select: { id: true },
  });

  return { threadId: thread.id, isNew: true };
}

export async function getThreadMessages(
  threadId: string,
  userId: string
): Promise<Message[]> {
  const participant = await db.messageThreadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
  });
  if (!participant) throw new Error("Not a participant in this thread");

  const messages = await db.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });

  // mark all unread messages from others as read
  const unreadIds = messages
    .filter((m) => m.senderId !== userId && !m.readAt)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await db.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    });
  }

  return messages as unknown as Message[];
}

export async function getOrCreateListingThread({
  ownerId,
  borrowerId,
  subject,
}: {
  ownerId: string;
  borrowerId: string;
  subject: string;
}): Promise<{ threadId: string; isNew: boolean }> {
  const existing = await db.messageThread.findFirst({
    where: {
      bookingId: null,
      subject,
      AND: [
        { participants: { some: { userId: ownerId } } },
        { participants: { some: { userId: borrowerId } } },
      ],
    },
    select: { id: true },
  });

  if (existing) return { threadId: existing.id, isNew: false };

  const thread = await db.messageThread.create({
    data: {
      subject,
      participants: {
        create: [ownerId, borrowerId].map((userId) => ({ userId })),
      },
    },
    select: { id: true },
  });

  return { threadId: thread.id, isNew: true };
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string
): Promise<Message> {
  const participant = await db.messageThreadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: senderId } },
  });
  if (!participant) throw new Error("Not a participant in this thread");

  const [message] = await db.$transaction([
    db.message.create({
      data: { threadId, senderId, body },
      include: messageInclude,
    }),
    db.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return message as unknown as Message;
}
