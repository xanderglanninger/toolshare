import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

export const AD_PLANS = [
  { id: "starter", name: "Starter", days: 30,  price: 499  },
  { id: "growth",  name: "Growth",  days: 60,  price: 899  },
  { id: "pro",     name: "Pro",     days: 90,  price: 1299 },
] as const;

export type PlanId = (typeof AD_PLANS)[number]["id"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ads = await db.ad.findMany({
    where: { advertiserId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(ads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, tagline, imageUrl, linkUrl, ctaText, priceText, planId } = body;

  if (!title || !linkUrl || !planId) {
    return NextResponse.json({ error: "title, linkUrl, and planId are required" }, { status: 400 });
  }

  const plan = AD_PLANS.find((p) => p.id === planId);
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const ad = await db.ad.create({
    data: {
      title,
      tagline:     tagline   || null,
      imageUrl:    imageUrl  || null,
      linkUrl,
      ctaText:     ctaText   || "Learn More",
      priceText:   priceText || null,
      active:      false,
      status:      "PENDING_PAYMENT",
      planDays:    plan.days,
      planPrice:   plan.price,
      advertiserId: session.user.id,
    },
  });

  return NextResponse.json(ad, { status: 201 });
}
