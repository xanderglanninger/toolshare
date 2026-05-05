# ToolShare — Platform Features

ToolShare is a peer-to-peer equipment rental marketplace built for the South African market, enabling users to lend and borrow equipment with secure payments, escrow protection, and real-time communication.

---

## Authentication & Onboarding

### Landing Page (`/`)
- Marketing homepage with category showcase, platform statistics, and call-to-action

### Registration (`/registration`)
- Multi-step account creation: name/surname/email → SA ID verification → password setup
- SA ID number validation with visual document preview
- Password strength indicator
- Google OAuth sign-up

### Login (`/login`)
- Email/password authentication
- Google OAuth sign-in
- Animated carousel showcasing platform benefits
- Post-login redirect support

---

## Browsing & Discovery

### Listing Detail Page (`/listings/[id]`)
- Multi-image gallery with thumbnail navigation
- Pricing display: daily, weekly, and monthly rates
- Refundable deposit information
- Equipment description and specifications
- Owner profile card (name, avatar, link to all their listings)
- Approximate location map (Mapbox)
- Delivery details: availability, radius, and fee
- Customer reviews with star ratings
- Date range picker for booking
- Automatic price calculation based on rental duration
- "Message Owner" and "Book Item" actions with total price display

### Lister Profile Page (`/dashboard/lister/[id]`)
- Owner avatar, name, and member-since date
- Stats: listing count, average rating, total reviews
- Grid of all active listings from that owner

---

## Dashboard — Borrower Features

### Dashboard Home (`/dashboard`)
- Personalised recommendations and today's picks

### Bookings (`/dashboard/bookings`)
- Tab filtering: All · Pending · Confirmed · Active · Closed
- Role toggle: Borrowed vs. Lent view
- Status badges and escrow status indicators
- Booking cards showing item, dates, price, and counterparty
- Booking journey tracker showing lifecycle stages
- Contract signing workflows (handover + receipt)
- Dual-confirmation system for marking a booking complete
- Cancellation/early-return request flow
- Post-completion review submission

### Handover Contract (`/dashboard/bookings/[id]/handover-contract`)
- Owner signs to confirm item handover

### Receipt Contract (`/dashboard/bookings/[id]/receipt-contract`)
- Borrower signs to confirm item receipt

### Cancel-Return Request (`/dashboard/bookings/[id]/cancel-return`)
- Initiate a cancellation or early-return request

### Messaging (`/dashboard/messages`)
- Conversation thread list with last-message preview and timestamps
- Unread message indicators
- Real-time chat (Pusher)
- Item/booking context card within each thread
- Dispute reporting with evidence file uploads

### Notifications (`/dashboard/notifications`)
- Activity feed: bookings, messages, reviews, disputes, fund releases
- Clickable notifications routed to the relevant page
- Mark-as-read and unread count badge

### Settings (`/dashboard/settings`)
- Edit profile: name, surname, email
- Avatar/profile image upload
- Light/dark theme toggle
- Identity verification status display

---

## Dashboard — Lender Features

### My Listings (`/dashboard/listings`)
- Grid view of all owned equipment listings
- Category, pricing, and availability display
- Pause/activate listing toggle
- Edit and delete actions
- Add new listing button

### Create Listing (`/dashboard/create`)
Multi-step form covering:
- Title and description
- Category selection (12 categories)
- Daily, weekly, and monthly pricing tiers
- Refundable deposit amount
- Multi-image upload
- Location: address, city, province, postal code, map coordinates
- Delivery options: enable/disable, radius (km), delivery fee
- Availability date range
- Form validation with inline error messages

### Edit Listing (`/dashboard/listings/[id]/edit`)
- Modify any field from the creation form

### Earnings (`/dashboard/statistics` — Earnings tab)
- Total earned, total bookings, average per booking, active listings count
- 6-month revenue chart with month-over-month percentage change
- Monthly earnings breakdown
- Per-listing earnings: title, booking count, amount earned

---

## Statistics (`/dashboard/statistics`)
- Recent transactions and activity summary
- Message threads overview
- Top-performing listings
- Booking status breakdown chart

---

## Payments & Checkout

### Payment Page (`/payment/[bookingId]`)
- Booking summary card
- Step indicator: Booking → Payment → Confirmed
- Escrow protection notice and deposit explanation
- Separate Stripe payment flows for rental and deposit (when applicable)
- Stripe card form with test-mode simulator
- 3D Secure redirect recovery
- Payment success confirmation with booking number

### Invoice (`/invoice/[bookingId]`)
- Formatted invoice with invoice number and status
- Bill-to and service-by party details
- Rental period, line items, quantity, and rate
- Deposit and rental subtotals, grand total
- Payment confirmation details
- Print/save functionality

---

## Dispute Resolution

### Admin Disputes Dashboard (`/dashboard/admin/disputes`)
- List of all open disputes with expandable detail cards
- Reporter vs. reported party information
- Booking snapshot and complaint text
- Evidence file viewing (images, documents)
- Evidence upload
- Admin decision options:
  - Full refund to borrower
  - Partial refund (configurable percentage)
  - No refund (release funds to owner)
- Admin notes field
- Status tracking: Pending → Reviewed → Resolved
- Escrow status display

---

## Cross-Cutting Features

### Reviews System
- Star rating (1–5) after booking completion
- Optional written comment
- Reviewer identity protected
- Average rating and review count shown on listings and lister profiles

### Escrow & Payments
- Funds held securely until both parties confirm completion
- Automatic release on dual confirmation
- Dispute-triggered fund freeze
- Partial and full refund capability
- ZAR (South African Rand) pricing throughout

### Booking Lifecycle States
| State | Description |
|---|---|
| PENDING | Booking request submitted by borrower |
| CONFIRMED | Payment received, booking locked in |
| ACTIVE | Item handed over (handover contract signed) |
| COMPLETED | Item returned, both parties confirmed |
| CANCELLED | Cancelled with applicable refund rules applied |

### Pricing Tiers
- Daily rate (always required)
- Weekly rate (optional)
- Monthly rate (optional)
- Automatic rate selection based on rental duration

### Delivery System
- Optional per-listing delivery service
- Configurable delivery radius (km)
- Configurable delivery fee
- Displayed on listing detail and booking summary

### Notifications (Real-Time)
- Booking request received / confirmed
- New message
- Payment received
- Contract signed
- Dispute opened / resolved
- Deposit returned
- Funds released

### Image Management
- Multi-image upload for listings
- Cloud storage via Supabase
- Gallery view with thumbnail navigation

### User Verification
- Email verification
- SA ID number validation
- Password security requirements
- Google OAuth
- Role-based access control (borrower, lender, admin)

---

## Route Summary

| Type | Routes |
|---|---|
| Public | `/`, `/login`, `/registration`, `/listings/[id]`, `/dashboard/lister/[id]`, `/payment/[id]`, `/invoice/[id]` |
| Protected | `/dashboard`, `/dashboard/bookings`, `/dashboard/messages`, `/dashboard/notifications`, `/dashboard/settings`, `/dashboard/statistics`, `/dashboard/listings`, `/dashboard/create`, `/dashboard/listings/[id]/edit` |
| Admin | `/dashboard/admin/disputes` |
