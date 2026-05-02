import { db } from "@/lib/db/client";
import { issuePartialRefund, releaseDeposit } from "@/lib/services/payments.service";
import { createNotification } from "@/lib/services/notification.service";
import type { CreateReportInput, Report } from "@/lib/types";
import type { AdminDecision, DisputeType, ReportReason } from "@prisma/client";

const FINANCIAL_REASONS: ReportReason[] = ["NO_SHOW", "DAMAGED_EQUIPMENT", "PAYMENT_DISPUTE"];

export async function createReport(input: CreateReportInput): Promise<Report> {
  if (input.reporterId === input.reportedId) {
    throw new Error("Cannot report yourself");
  }

  const report = await db.report.create({
    data: {
      reporterId: input.reporterId,
      reportedId: input.reportedId,
      bookingId: input.bookingId ?? null,
      reason: input.reason,
      details: input.details ?? null,
    },
  });

  return report as unknown as Report;
}

export async function openDispute(input: {
  reporterId: string;
  reportedId: string;
  bookingId: string;
  reason: ReportReason;
  details?: string;
  disputeType: DisputeType;
}): Promise<Report> {
  if (input.reporterId === input.reportedId) throw new Error("Cannot report yourself.");

  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: { listing: { select: { ownerId: true } } },
  });
  if (!booking) throw new Error("Booking not found.");

  const isParty =
    booking.borrowerId === input.reporterId ||
    booking.listing.ownerId === input.reporterId;
  if (!isParty) throw new Error("You are not a party to this booking.");

  const report = await db.$transaction(async (tx) => {
    const created = await tx.report.create({
      data: {
        reporterId: input.reporterId,
        reportedId: input.reportedId,
        bookingId: input.bookingId,
        reason: input.reason,
        details: input.details ?? null,
        disputeType: input.disputeType,
        escrowFrozen: true,
      },
    });

    // Freeze escrow and cancel any scheduled release
    await tx.payment.updateMany({
      where: { bookingId: input.bookingId },
      data: { escrowStatus: "DISPUTED" },
    });
    await tx.escrowReleaseJob.updateMany({
      where: { bookingId: input.bookingId, status: "PENDING" },
      data: { status: "FAILED", error: "frozen_by_dispute" },
    });

    return created;
  });

  // Notify both parties
  const otherPartyId =
    booking.borrowerId === input.reporterId
      ? booking.listing.ownerId
      : booking.borrowerId;

  await createNotification({
    userId: input.reporterId,
    type: "DISPUTE_OPENED",
    title: "Dispute submitted",
    body: "Your dispute has been submitted. An admin will review it shortly. Funds are held until resolved.",
    tab: "bookings",
    linkData: input.bookingId,
  });
  await createNotification({
    userId: otherPartyId,
    type: "DISPUTE_OPENED",
    title: "A dispute has been opened",
    body: "The other party has opened a dispute for this booking. An admin will review and contact both parties.",
    tab: "bookings",
    linkData: input.bookingId,
  });

  return report as unknown as Report;
}

export async function addDisputeEvidence(input: {
  reportId: string;
  uploaderId: string;
  fileUrl: string;
  fileType: string;
  description?: string;
}) {
  const report = await db.report.findUnique({
    where: { id: input.reportId },
    include: { booking: { select: { borrowerId: true, listing: { select: { ownerId: true } } } } },
  });
  if (!report) throw new Error("Report not found.");
  if (!report.booking) throw new Error("Report is not linked to a booking.");

  const isParty =
    report.booking.borrowerId === input.uploaderId ||
    report.booking.listing.ownerId === input.uploaderId;
  if (!isParty) throw new Error("Only parties to the booking can submit evidence.");

  return db.disputeEvidence.create({
    data: {
      reportId: input.reportId,
      uploaderId: input.uploaderId,
      fileUrl: input.fileUrl,
      fileType: input.fileType,
      description: input.description ?? null,
    },
  });
}

export async function resolveDispute(input: {
  reportId: string;
  adminId: string;
  decision: AdminDecision;
  adminNotes?: string;
  refundPercent?: number;
}): Promise<void> {
  const admin = await db.user.findUnique({ where: { id: input.adminId } });
  if (!admin || admin.role !== "ADMIN") throw new Error("Admin access required.");

  const report = await db.report.findUnique({
    where: { id: input.reportId },
    include: {
      booking: {
        include: {
          payment: true,
          listing: { select: { ownerId: true } },
        },
      },
    },
  });
  if (!report) throw new Error("Report not found.");
  if (!report.booking) throw new Error("Report is not linked to a booking.");
  if (!["PENDING", "REVIEWED"].includes(report.status)) throw new Error("Report is already resolved.");

  const bookingId = report.bookingId!;
  const refundPercent = (input.refundPercent ?? 0) as 0 | 50 | 100;

  await db.report.update({
    where: { id: input.reportId },
    data: {
      status: "RESOLVED",
      adminDecision: input.decision,
      adminNotes: input.adminNotes ?? null,
      adminId: input.adminId,
      resolvedAt: new Date(),
      refundPercent: input.refundPercent ?? null,
      escrowFrozen: false,
    },
  });

  // Execute financial decision
  if (input.decision === "FULL_REFUND_BORROWER") {
    await issuePartialRefund(bookingId, 100);
    await releaseDeposit(bookingId, "borrower");
  } else if (input.decision === "PARTIAL_REFUND_BORROWER") {
    await issuePartialRefund(bookingId, refundPercent);
    // Deposit handling: if partial, return deposit to borrower (benefit of doubt)
    await releaseDeposit(bookingId, "borrower");
  } else {
    // NO_REFUND_KEEP_WITH_OWNER
    await issuePartialRefund(bookingId, 0);
    await releaseDeposit(bookingId, "owner");
  }

  // Notify both parties
  const borrowerId = report.booking.borrowerId;
  const ownerId = report.booking.listing.ownerId;

  const outcomeMessage =
    input.decision === "FULL_REFUND_BORROWER"
      ? "The admin has decided in your favour. A full refund has been issued."
      : input.decision === "PARTIAL_REFUND_BORROWER"
      ? `The admin has issued a partial refund (${input.refundPercent ?? 0}% to borrower).`
      : "The admin has decided in favour of the owner. No refund has been issued.";

  await createNotification({
    userId: borrowerId,
    type: "DISPUTE_RESOLVED",
    title: "Dispute resolved",
    body: outcomeMessage,
    tab: "bookings",
    linkData: bookingId,
  });
  await createNotification({
    userId: ownerId,
    type: "DISPUTE_RESOLVED",
    title: "Dispute resolved",
    body: outcomeMessage,
    tab: "bookings",
    linkData: bookingId,
  });
}

export async function getReportsByReporter(reporterId: string): Promise<Report[]> {
  const reports = await db.report.findMany({
    where: { reporterId },
    orderBy: { createdAt: "desc" },
  });
  return reports as unknown as Report[];
}

export function isFinancialDispute(reason: ReportReason): boolean {
  return FINANCIAL_REASONS.includes(reason);
}
