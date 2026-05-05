# ToolShare — Equipment Lending Platform

A Next.js marketplace for listing and borrowing construction equipment.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
├── (auth)/login/        # Login page + CSS module
├── api/                 # REST route handlers (shared by web + mobile)
│   ├── equipment/
│   ├── bookings/
│   ├── payments/
│   └── messages/
├── browse/              # Equipment browse page
├── listings/[id]/       # Listing detail page
├── messages/            # Messaging page
└── dashboard/           # Owner dashboard

components/
├── ui/                  # Generic: Button, Input, Modal …
└── features/            # Domain: EquipmentCard, BookingCalendar …

lib/
├── db/client.ts         # Prisma singleton
├── services/            # Business logic (equipment, booking, payments …)
├── types/index.ts       # Shared TypeScript types
└── utils/helpers.ts     # Formatting and utility functions
```

## Services to configure

| Service | Purpose | Env vars |
|---------|---------|----------|
| PostgreSQL / Supabase | Database | `DATABASE_URL` |
| Prisma | ORM | — |
| Stripe | Payments | `STRIPE_SECRET_KEY` |
| Supabase Storage / S3 | Image uploads | `SUPABASE_*` |
| Mapbox | Equipment maps | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| Pusher | Real-time messaging | `PUSHER_*` |
| NextAuth / Clerk | Authentication | `NEXTAUTH_*` |

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```
