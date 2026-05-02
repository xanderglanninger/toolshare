"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Package,
  Monitor, Wrench, Tent, Car, Shirt, Sofa,
  Music, BookOpen, Gamepad2, Camera, PartyPopper,
} from "lucide-react";
import styles from "./page.module.css";

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  ELECTRONICS:           <Monitor size={28} />,
  TOOLS_EQUIPMENT:       <Wrench size={28} />,
  SPORTS_OUTDOORS:       <Tent size={28} />,
  VEHICLES:              <Car size={28} />,
  CLOTHING_ACCESSORIES:  <Shirt size={28} />,
  FURNITURE_HOME:        <Sofa size={28} />,
  MUSICAL_INSTRUMENTS:   <Music size={28} />,
  BOOKS_MEDIA:           <BookOpen size={28} />,
  GAMES_TOYS:            <Gamepad2 size={28} />,
  CAMERAS_PHOTOGRAPHY:   <Camera size={28} />,
  PARTY_EVENTS:          <PartyPopper size={28} />,
  OTHER:                 <Package size={28} />,
};

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRONICS: "Electronics", TOOLS_EQUIPMENT: "Tools & Equipment",
  SPORTS_OUTDOORS: "Sports & Outdoors", VEHICLES: "Vehicles",
  CLOTHING_ACCESSORIES: "Clothing & Accessories", FURNITURE_HOME: "Furniture & Home",
  MUSICAL_INSTRUMENTS: "Musical Instruments", BOOKS_MEDIA: "Books & Media",
  GAMES_TOYS: "Games & Toys", CAMERAS_PHOTOGRAPHY: "Cameras & Photography",
  PARTY_EVENTS: "Party & Events", OTHER: "Other",
};

interface ListerListing {
  id: string;
  title: string;
  images: string[];
  category: string;
  pricePerDay: number;
  pricePerWeek: number | null;
  pricePerMonth: number | null;
  city: string;
  province: string;
  depositAmount: number | null;
}

interface ListerData {
  user: { id: string; name: string; surname: string; image: string | null; createdAt: string };
  listings: ListerListing[];
  reviewStats: { averageRating: number; count: number };
}

export default function ListerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ListerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((json) => { if (json) setData(json.data ?? null); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHero} />
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.cardSkeleton}>
              <div className={styles.skeletonImg} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} style={{ width: "70%" }} />
                <div className={styles.skeletonLine} style={{ width: "45%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><Package size={48} /></span>
          <p className={styles.emptyTitle}>Profile not found</p>
          <p className={styles.emptySub}>This lister's profile doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const { user, listings, reviewStats } = data;
  const initials = (user.name?.[0] ?? "").toUpperCase() + (user.surname?.[0] ?? "").toUpperCase();
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

  return (
    <div className={styles.page}>

      {/* ── Back ─────────────────────────────────────────────── */}
      <button className={styles.backBtn} onClick={() => router.back()}>
        <ArrowLeft size={13} /> Back
      </button>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarWrap}>
            {user.image
              ? <img src={user.image} alt="" className={styles.avatarImg} />
              : <div className={styles.avatarInitials}>{initials}</div>}
          </div>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Lister Profile</p>
            <h1 className={styles.heroTitle}>{user.name} {user.surname}</h1>
            <p className={styles.heroSub}>Member since {memberSince}</p>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatVal}>{listings.length}</span>
            <span className={styles.heroStatLabel}>Listings</span>
          </div>
          {reviewStats.count > 0 && (
            <>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}>
                <span className={styles.heroStatVal}>{reviewStats.averageRating.toFixed(1)} ★</span>
                <span className={styles.heroStatLabel}>Avg rating</span>
              </div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}>
                <span className={styles.heroStatVal}>{reviewStats.count}</span>
                <span className={styles.heroStatLabel}>Reviews</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Listings ─────────────────────────────────────────── */}
      <div className={styles.sectionHead}>
        <p className={styles.pageSub}>Browse</p>
        <p className={styles.pageTitle}>Available Listings</p>
      </div>

      {listings.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><Package size={48} /></span>
          <p className={styles.emptyTitle}>No active listings</p>
          <p className={styles.emptySub}>This lister has no items available right now.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {listings.map((listing) => {
            const icon  = CATEGORY_ICONS[listing.category] ?? <Package size={28} />;
            const label = CATEGORY_LABELS[listing.category] ?? "Other";
            const hasImage = listing.images.length > 0;

            return (
              <Link key={listing.id} href={`/listings/${listing.id}`} className={styles.card}>
                <div className={styles.cardImg}>
                  {hasImage ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className={styles.cardImgEl}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.cardImgPlaceholder}>
                      <span className={styles.cardImgIcon}>{icon}</span>
                    </div>
                  )}
                  <span className={styles.cardBadge}>{label}</span>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.cardTitle}>{listing.title}</p>
                  <p className={styles.cardCity}>{listing.city}, {listing.province}</p>

                  <div className={styles.cardFooter}>
                    <div className={styles.cardPriceGroup}>
                      <span className={styles.cardPrice}>
                        R {Number(listing.pricePerDay).toLocaleString("en-ZA")}
                        <span className={styles.cardPriceSub}>/day</span>
                      </span>
                      {listing.pricePerWeek && (
                        <span className={styles.cardWeekPrice}>
                          R {Number(listing.pricePerWeek).toLocaleString("en-ZA")}/wk
                        </span>
                      )}
                    </div>
                    <button className={styles.cardBtn} tabIndex={-1}>View</button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
