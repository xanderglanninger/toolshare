import { db } from "@/lib/db/client";
import type { NotificationType } from "@prisma/client";

export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  tab?: string;
  linkData?: string;
}) {
  return db.notification.create({ data });
}

export async function getNotifications(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const where = ids?.length
    ? { userId, id: { in: ids }, readAt: null }
    : { userId, readAt: null };
  return db.notification.updateMany({ where, data: { readAt: new Date() } });
}
