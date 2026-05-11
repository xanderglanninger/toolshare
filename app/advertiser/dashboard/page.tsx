"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard.module.css";

interface Ad {
  id: string;
  title: string;
  tagline: string | null;
  imageUrl: string | null;
  linkUrl: string;
  ctaText: string;
  priceText: string | null;
  status: "PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "REJECTED";
  planDays: number | null;
  planPrice: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<Ad["status"], string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  ACTIVE:          "Active",
  PAUSED:          "Paused",
  EXPIRED:         "Expired",
  REJECTED:        "Rejected",
};

const STATUS_COLOR: Record<Ad["status"], string> = {
  PENDING_PAYMENT: styles.statusPending,
  ACTIVE:          styles.statusActive,
  PAUSED:          styles.statusPaused,
  EXPIRED:         styles.statusExpired,
  REJECTED:        styles.statusRejected,
};

function daysLeft(endsAt: string | null) {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function AdvertiserDashboardContent() {
  const { data: session, status } = useSession();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const justPaid     = searchParams.get("paid");

  const [ads,     setAds]     = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/advertiser/ads");
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  async function retryPayment(ad: Ad) {
    const res = await fetch(`/api/advertiser/ads/${ad.id}/checkout`, { method: "POST" });
    if (!res.ok) { alert("Checkout failed. Please try again."); return; }
    const { data } = await res.json();
    window.location.href = data.authorization_url;
  }

  if (status === "loading" || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading your campaigns…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Advertiser Portal</p>
          <h1 className={styles.title}>My Campaigns</h1>
        </div>
        <Link href="/advertiser/create" className={styles.newBtn}>+ New Campaign</Link>
      </div>

      {justPaid && (
        <div className={styles.successBanner}>
          Payment received! Your ad will go live as soon as Paystack confirms the transaction (usually within a minute).
        </div>
      )}

      {ads.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No campaigns yet</p>
          <p className={styles.emptySub}>Create your first ad and start reaching LendMe's audience today.</p>
          <Link href="/advertiser/create" className={styles.emptyCta}>Create a campaign →</Link>
        </div>
      ) : (
        <div className={styles.adList}>
          {ads.map((ad) => {
            const left = daysLeft(ad.endsAt);
            return (
              <div key={ad.id} className={styles.adCard}>
                {ad.imageUrl && (
                  <img src={ad.imageUrl} alt={ad.title} className={styles.adThumb} />
                )}
                <div className={styles.adInfo}>
                  <div className={styles.adTitleRow}>
                    <p className={styles.adTitle}>{ad.title}</p>
                    <span className={`${styles.statusBadge} ${STATUS_COLOR[ad.status]}`}>
                      {STATUS_LABEL[ad.status]}
                    </span>
                  </div>
                  {ad.tagline && <p className={styles.adTagline}>{ad.tagline}</p>}
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className={styles.adLink}>
                    {ad.linkUrl}
                  </a>
                  <div className={styles.adMeta}>
                    {ad.planDays && <span>{ad.planDays}-day plan · R {(ad.planPrice ?? 0).toLocaleString("en-ZA")}</span>}
                    {ad.startsAt && <span>Started {new Date(ad.startsAt).toLocaleDateString("en-ZA")}</span>}
                    {ad.endsAt   && <span>Ends {new Date(ad.endsAt).toLocaleDateString("en-ZA")}</span>}
                    {ad.status === "ACTIVE" && left !== null && (
                      <span className={left <= 7 ? styles.metaWarn : ""}>{left} days left</span>
                    )}
                  </div>
                </div>
                {ad.status === "PENDING_PAYMENT" && (
                  <button className={styles.payBtn} onClick={() => retryPayment(ad)}>
                    Pay now
                  </button>
                )}
                {ad.status === "ACTIVE" && (
                  <Link href={`/advertiser/create?renew=${ad.id}`} className={styles.renewBtn}>
                    Renew
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdvertiserDashboardPage() {
  return (
    <Suspense>
      <AdvertiserDashboardContent />
    </Suspense>
  );
}
