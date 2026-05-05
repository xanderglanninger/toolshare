// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  image: string | null;
  createdAt: Date;
}

// ─── Equipment ───────────────────────────────────────────────────────────────

export type EquipmentCategory =
  | "excavator"
  | "crane"
  | "scaffolding"
  | "vehicle"
  | "tool"
  | "other";

export interface Equipment {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: EquipmentCategory;
  dailyRate: number;
  weeklyRate?: number;
  imageUrls: string[];
  location: { lat: number; lng: number; address: string };
  available: boolean;
  createdAt: Date;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookingStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Booking {
  id: string;
  listingId: string;
  borrowerId: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  depositAmount: number | null;
  status: BookingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingWithDetails extends Booking {
  listing: {
    id: string;
    title: string;
    images: string[];
    pricePerDay: number;
    pricePerWeek: number | null;
    pricePerMonth: number | null;
    city: string;
    province: string;
    category: string;
    owner: { id: string; name: string; surname: string; image: string | null };
  };
  borrower: { id: string; name: string; surname: string; image: string | null };
  payment: {
    status: PaymentStatus;
    paidAt: Date | null;
    amount: number;
    paymentReference: string | null;
  } | null;
  reviews: { reviewerId: string }[];
  // Wizard handover steps
  listerInitiatedHandover: boolean;
  listerInitiatedHandoverAt: Date | null;
  borrowerIssuesSubmitted: boolean;
  borrowerIssuesSubmittedAt: Date | null;
  listerConfirmedIssues: boolean;
  listerConfirmedIssuesAt: Date | null;
  listerHandoverSigned: boolean;
  listerHandoverSignedAt: Date | null;
  borrowerReceiptSigned: boolean;
  borrowerReceiptSignedAt: Date | null;
  // Completion
  borrowerConfirmed: boolean;
  borrowerConfirmedAt: Date | null;
  ownerConfirmed: boolean;
  ownerConfirmedAt: Date | null;
  // Cancel-return flow
  cancelReturnRequested: boolean;
  cancelReturnRequestedAt: Date | null;
  // Return inspection
  listerReturnInspected: boolean;
  listerReturnInspectedAt: Date | null;
  listerReturnDamageClaimed: boolean;
  borrowerAcknowledgedReturn: boolean;
  borrowerAcknowledgedReturnAt: Date | null;
  // Pickup arrangement
  pickupLocation: string | null;
  agreedHandoverTime: Date | null;
  issues: BookingIssue[];
  returnIssues: ReturnIssue[];
  rentalUpdates: RentalUpdate[];
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface MessageSender {
  id: string;
  name: string;
  surname: string;
  image: string | null;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  sender: MessageSender;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface ThreadParticipant {
  userId: string;
  user: { id: string; name: string; surname: string; image: string | null };
}

export interface ThreadBookingInfo {
  id: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  depositAmount: number | null;
  status: BookingStatus;
  listing: {
    id: string;
    title: string;
    images: string[];
    category: string;
    city: string;
    province: string;
    pricePerDay: number;
  };
}

export interface MessageThread {
  id: string;
  subject: string | null;
  bookingId: string | null;
  bookingInfo: ThreadBookingInfo | null;
  participants: ThreadParticipant[];
  lastMessage: Message | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportReason =
  | "NO_SHOW"
  | "DAMAGED_EQUIPMENT"
  | "FRAUDULENT_LISTING"
  | "INAPPROPRIATE_BEHAVIOR"
  | "PAYMENT_DISPUTE"
  | "OTHER";

export type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  bookingId: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportInput {
  reporterId: string;
  reportedId: string;
  bookingId?: string;
  reason: ReportReason;
  details?: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewedId: string;
  listingId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  reviewer: { id: string; name: string; surname: string; image: string | null };
}

export interface ListingReviewSummary {
  averageRating: number;
  count: number;
  reviews: Review[];
}

// ─── Rental Updates ──────────────────────────────────────────────────────────

export interface RentalUpdate {
  id: string;
  bookingId: string;
  message: string;
  photos: string[];
  createdAt: Date;
}

// ─── Booking Issues ──────────────────────────────────────────────────────────

export interface BookingIssue {
  id: string;
  bookingId: string;
  description: string;
  photos: string[];
  createdAt: Date;
}

export interface ReturnIssue {
  id: string;
  bookingId: string;
  description: string;
  photos: string[];
  createdAt: Date;
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
