"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import styles from "./Earnings.module.css";

type MonthPoint = { month: string; year: number; amount: number };
type ListingBreakdown = {
  listingId: string;
  title: string;
  bookings: number;
  earned: number;
};

type EarningsData = {
  totalEarned: number;
  totalBookings: number;
  avgPerBooking: number;
  activeListings: number;
  percentageChange: number | null;
  monthly: MonthPoint[];
  byListing: ListingBreakdown[];
};

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtK(n: number) {
  return n >= 1000 ? `R${(n / 1000).toFixed(1)}k` : `R${n}`;
}

function SkeletonBar() {
  return <div className={styles.skeleton} />;
}

export default function Earnings() {
  const { data: session } = useSession();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    fetch("/api/earnings")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
      })
      .catch((e) => setError(e.message ?? "Failed to load earnings"))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const monthly = data?.monthly ?? [];
  const byListing = data?.byListing ?? [];
  const maxEarning = Math.max(...monthly.map((m) => m.amount), 1);
  const maxBookings = Math.max(...byListing.map((b) => b.bookings), 1);

  const totalEarned = data?.totalEarned ?? 0;
  const totalBookings = data?.totalBookings ?? 0;
  const avgPerBooking = data?.avgPerBooking ?? 0;
  const activeListings = data?.activeListings ?? 0;
  const pct = data?.percentageChange;

  // 6-month sum from monthly data
  const sixMonthTotal = monthly.reduce((s, m) => s + m.amount, 0);

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Financial</p>
        <h1 className={styles.pageTitle}>Earnings</h1>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroMain}>
          <p className={styles.heroLabel}>Total earned (6 months)</p>
          {loading ? (
            <div className={styles.skeletonHero} />
          ) : (
            <>
              <p className={styles.heroAmount}>{fmt(sixMonthTotal)}</p>
              {pct !== null && pct !== undefined ? (
                <p className={pct >= 0 ? styles.heroUp : styles.heroDown}>
                  {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% vs previous month
                </p>
              ) : (
                <p className={styles.heroNeutral}>No comparison data yet</p>
              )}
            </>
          )}
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            {loading ? (
              <div className={styles.skeletonStat} />
            ) : (
              <p className={styles.heroStatVal}>{totalBookings}</p>
            )}
            <p className={styles.heroStatLabel}>Total bookings</p>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            {loading ? (
              <div className={styles.skeletonStat} />
            ) : (
              <p className={styles.heroStatVal}>{fmt(Math.round(avgPerBooking))}</p>
            )}
            <p className={styles.heroStatLabel}>Avg per booking</p>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            {loading ? (
              <div className={styles.skeletonStat} />
            ) : (
              <p className={styles.heroStatVal}>{activeListings}</p>
            )}
            <p className={styles.heroStatLabel}>Active listings</p>
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>

        {/* ── Bar chart ── */}
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Monthly earnings</p>
          {loading ? (
            <div className={styles.chartSkeleton}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBar key={i} />
              ))}
            </div>
          ) : monthly.length === 0 ? (
            <div className={styles.empty}>No earnings data yet</div>
          ) : (
            <div className={styles.chart}>
              {monthly.map((m, i) => (
                <div key={i} className={styles.barCol}>
                  <span className={styles.barAmt}>{fmtK(m.amount)}</span>
                  <div className={styles.barWrap}>
                    <div
                      className={`${styles.barFill}${i === monthly.length - 1 ? " " + styles.barFillActive : ""}`}
                      style={{ height: `${(m.amount / maxEarning) * 100}%` }}
                    />
                  </div>
                  <span className={styles.barMonth}>{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Breakdown by listing ── */}
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Earnings by listing</p>
          {loading ? (
            <div className={styles.breakdownSkeleton}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonRow} />
              ))}
            </div>
          ) : byListing.length === 0 ? (
            <div className={styles.empty}>
              No completed bookings yet.<br />
              Earnings will appear here once renters pay.
            </div>
          ) : (
            <div className={styles.breakdown}>
              {byListing.map((item) => (
                <div key={item.listingId} className={styles.breakdownRow}>
                  <div className={styles.breakdownInfo}>
                    <p className={styles.breakdownName}>{item.title}</p>
                    <p className={styles.breakdownSub}>{item.bookings} booking{item.bookings !== 1 ? "s" : ""}</p>
                  </div>
                  <div className={styles.breakdownBarWrap}>
                    <div
                      className={styles.breakdownBarFill}
                      style={{ width: `${(item.bookings / maxBookings) * 100}%` }}
                    />
                  </div>
                  <span className={styles.breakdownAmt}>
                    {fmt(item.earned)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Lifetime total ── */}
      {!loading && totalEarned > 0 && sixMonthTotal !== totalEarned && (
        <div className={styles.lifetimeRow}>
          <span className={styles.lifetimeLabel}>Lifetime earnings</span>
          <span className={styles.lifetimeVal}>{fmt(totalEarned)}</span>
        </div>
      )}
    </div>
  );
}
