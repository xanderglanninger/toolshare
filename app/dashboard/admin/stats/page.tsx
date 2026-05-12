"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./stats.module.css";

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  paystackRef: string | null;
  note: string | null;
  createdAt: string;
};

type Stats = {
  users: {
    total: number; verified: number; pendingKyc: number;
    newThisMonth: number; newLastMonth: number; activeLast30Days: number;
  };
  listings: { total: number; active: number };
  bookings: { total: number; active: number; completed: number; cancelled: number; pending: number };
  revenue: { total: number; thisMonth: number; lastMonth: number; platformFees: number };
  disputes: { pending: number; resolved: number };
  revenueChart: { label: string; amount: number }[];
  categoryBreakdown: { category: string; count: number }[];
  recentBookings: {
    id: string; totalAmount: number; platformFee: number | null;
    status: string; createdAt: string;
    listing: { title: string };
    borrower: { name: string };
  }[];
  topListings: {
    id: string; title: string; pricePerDay: number; category: string;
    _count: { bookings: number };
  }[];
  recentUsers: {
    id: string; name: string; surname: string | null; email: string;
    idVerificationStatus: string; createdAt: string;
  }[];
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);
}

function pct(a: number, b: number) {
  if (b === 0) return null;
  return ((a - b) / b) * 100;
}

function Change({ current, previous }: { current: number; previous: number }) {
  const d = pct(current, previous);
  if (d === null) return null;
  const label = `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(0)}% vs last month`;
  if (d > 0) return <span className={styles.changeUp}>{label}</span>;
  if (d < 0) return <span className={styles.changeDown}>{label}</span>;
  return <span className={styles.changeNeutral}>— same as last month</span>;
}

const CAT_LABELS: Record<string, string> = {
  ELECTRONICS: "Electronics",
  TOOLS_EQUIPMENT: "Tools & Equipment",
  SPORTS_OUTDOORS: "Sports & Outdoors",
  VEHICLES: "Vehicles",
  CLOTHING_ACCESSORIES: "Clothing",
  FURNITURE_HOME: "Furniture & Home",
  MUSICAL_INSTRUMENTS: "Instruments",
  BOOKS_MEDIA: "Books & Media",
  GAMES_TOYS: "Games & Toys",
  CAMERAS_PHOTOGRAPHY: "Cameras",
  PARTY_EVENTS: "Party & Events",
  OTHER: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    styles.badgeActive,
  COMPLETED: styles.badgeCompleted,
  PENDING:   styles.badgePending,
  CANCELLED: styles.badgeCancelled,
  CONFIRMED: styles.badgeConfirmed,
};

function rankClass(i: number) {
  if (i === 0) return `${styles.rank} ${styles.rank1}`;
  if (i === 1) return `${styles.rank} ${styles.rank2}`;
  if (i === 2) return `${styles.rank} ${styles.rank3}`;
  return styles.rank;
}

export default function AdminStatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const [balance,       setBalance]       = useState<number | null>(null);
  const [withdrawals,   setWithdrawals]   = useState<Withdrawal[]>([]);
  const [withdrawAmt,   setWithdrawAmt]   = useState("");
  const [withdrawing,   setWithdrawing]   = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawOk,    setWithdrawOk]    = useState("");

  const loadWithdraw = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/withdraw");
      const d = await r.json();
      if (d.balance != null) setBalance(d.balance);
      if (Array.isArray(d.history)) setWithdrawals(d.history);
    } catch {}
  }, []);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const r = await fetch("/api/admin/stats");
      const d = await r.json();
      setStats(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(withdrawAmt);
    if (!amount || amount <= 0) { setWithdrawError("Enter a valid amount."); return; }
    setWithdrawing(true); setWithdrawError(""); setWithdrawOk("");
    try {
      const res  = await fetch("/api/admin/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Withdrawal failed");
      setWithdrawOk(`R${amount.toFixed(2)} withdrawal initiated.`);
      setWithdrawAmt("");
      loadWithdraw();
    } catch (err: any) {
      setWithdrawError(err.message ?? "Something went wrong.");
    } finally {
      setWithdrawing(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    load();
    loadWithdraw();
  }, [status, router, load, loadWithdraw]);

  if (loading || status === "loading") {
    return <div className={styles.center}>Loading…</div>;
  }
  if (!stats || "error" in (stats as object)) {
    return <div className={styles.center}>Access denied or failed to load.</div>;
  }

  const maxRevenue = Math.max(...stats.revenueChart.map((r) => r.amount), 1);
  const maxCat     = Math.max(...stats.categoryBreakdown.map((c) => c.count), 1);

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>Admin Dashboard</span>
          <h1 className={styles.title}>Platform Statistics</h1>
          <p className={styles.sub}>Real-time overview of revenue, users, and platform activity.</p>
        </div>
        <button className={styles.refreshBtn} onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? "↻ Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* ── Hero revenue strip ── */}
      <div className={styles.heroStrip}>
        <div className={styles.heroCard}>
          <div className={styles.heroIcon}>💰</div>
          <span className={styles.heroLabel}>Total Revenue</span>
          <span className={styles.heroValue}>{fmt(stats.revenue.total)}</span>
          <span className={styles.heroSub}>All-time gross from succeeded payments</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGold}`}>📅</div>
          <span className={styles.statLabel}>This Month</span>
          <span className={styles.statValue}>{fmt(stats.revenue.thisMonth)}</span>
          <Change current={stats.revenue.thisMonth} previous={stats.revenue.lastMonth} />
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>📆</div>
          <span className={styles.statLabel}>Last Month</span>
          <span className={`${styles.statValue} ${styles.statValueBlue}`}>{fmt(stats.revenue.lastMonth)}</span>
          <span className={styles.statSub}>Completed payments</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGold}`}>✦</div>
          <span className={styles.statLabel}>Platform Fees</span>
          <span className={`${styles.statValue} ${styles.statValueGold}`}>{fmt(stats.revenue.platformFees)}</span>
          <span className={styles.statSub}>Net platform earnings</span>
        </div>
      </div>

      {/* ── Platform Withdrawal ── */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Withdraw Platform Profits</span>
          <span className={styles.panelSub}>
            {balance != null ? `Available Paystack balance: ${fmt(balance)}` : "Loading balance…"}
          </span>
        </div>
        <form onSubmit={handleWithdraw} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap", padding: "0 0 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-3)" }}>Amount (ZAR)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={withdrawAmt}
              onChange={e => setWithdrawAmt(e.target.value)}
              placeholder="e.g. 5000"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-1)", fontSize: 14, width: 160 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "transparent" }}>_</label>
            <button
              type="submit"
              disabled={withdrawing || !withdrawAmt}
              style={{ padding: "8px 18px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: withdrawing ? 0.7 : 1 }}
            >
              {withdrawing ? "Processing…" : "Withdraw"}
            </button>
          </div>
          {withdrawError && <p style={{ color: "#ef4444", fontSize: 13, alignSelf: "flex-end", margin: 0 }}>{withdrawError}</p>}
          {withdrawOk    && <p style={{ color: "#22c55e", fontSize: 13, alignSelf: "flex-end", margin: 0 }}>{withdrawOk}</p>}
        </form>
        {withdrawals.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paystack Ref</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td className={styles.tdMuted}>
                      {new Date(w.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className={styles.tdMono}>{fmt(w.amount)}</td>
                    <td>
                      <span className={`${styles.badge} ${
                        w.status === "SUCCESS" ? styles.badgeCompleted :
                        w.status === "FAILED"  ? styles.badgeCancelled : styles.badgePending
                      }`}>
                        {w.status.toLowerCase()}
                      </span>
                    </td>
                    <td className={styles.tdMuted}>{w.paystackRef ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Revenue chart ── */}
      <div className={styles.chartPanel}>
        <div className={styles.chartHead}>
          <span className={styles.chartTitle}>Revenue — Last 6 Months</span>
          <span className={styles.chartMeta}>Succeeded payments only</span>
        </div>
        <div className={styles.barChart}>
          {stats.revenueChart.map((r) => {
            const h = Math.max((r.amount / maxRevenue) * 100, 2);
            return (
              <div key={r.label} className={styles.barWrap}>
                <div className={styles.barOuter}>
                  <div className={styles.bar} style={{ height: `${h}%` }}>
                    <span className={styles.barTooltip}>{fmt(r.amount)}</span>
                  </div>
                </div>
                <div className={styles.barLabelRow}>
                  <span className={styles.barLabel}>{r.label.split(" ")[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Users ── */}
      <p className={styles.sectionLabel}>Users</p>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>👥</div>
          <span className={styles.statLabel}>Total Users</span>
          <span className={styles.statValue}>{stats.users.total.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>✔</div>
          <span className={styles.statLabel}>Verified</span>
          <span className={`${styles.statValue} ${styles.statValueGreen}`}>{stats.users.verified.toLocaleString()}</span>
          <span className={styles.statSub}>
            {stats.users.total > 0
              ? `${((stats.users.verified / stats.users.total) * 100).toFixed(0)}% of total`
              : "—"}
          </span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGold}`}>⏳</div>
          <span className={styles.statLabel}>Pending KYC</span>
          <span className={`${styles.statValue} ${styles.statValueGold}`}>{stats.users.pendingKyc.toLocaleString()}</span>
          <span className={styles.statSub}>Awaiting review</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconPurple}`}>✨</div>
          <span className={styles.statLabel}>New This Month</span>
          <span className={styles.statValue}>{stats.users.newThisMonth.toLocaleString()}</span>
          <Change current={stats.users.newThisMonth} previous={stats.users.newLastMonth} />
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>⚡</div>
          <span className={styles.statLabel}>Active (30d)</span>
          <span className={`${styles.statValue} ${styles.statValueGreen}`}>{stats.users.activeLast30Days.toLocaleString()}</span>
          <span className={styles.statSub}>Made or received a booking</span>
        </div>
      </div>

      {/* ── Bookings & Listings ── */}
      <p className={styles.sectionLabel}>Bookings &amp; Listings</p>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>📋</div>
          <span className={styles.statLabel}>Total Bookings</span>
          <span className={styles.statValue}>{stats.bookings.total.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>▶</div>
          <span className={styles.statLabel}>Active Now</span>
          <span className={`${styles.statValue} ${styles.statValueGreen}`}>{stats.bookings.active.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>✓</div>
          <span className={styles.statLabel}>Completed</span>
          <span className={`${styles.statValue} ${styles.statValueBlue}`}>{stats.bookings.completed.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconRed}`}>✕</div>
          <span className={styles.statLabel}>Cancelled</span>
          <span className={`${styles.statValue} ${styles.statValueRed}`}>{stats.bookings.cancelled.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGold}`}>◷</div>
          <span className={styles.statLabel}>Pending</span>
          <span className={`${styles.statValue} ${styles.statValueGold}`}>{stats.bookings.pending.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconPurple}`}>◈</div>
          <span className={styles.statLabel}>Total Listings</span>
          <span className={styles.statValue}>{stats.listings.total.toLocaleString()}</span>
          <span className={styles.statSub}>{stats.listings.active} currently active</span>
        </div>
      </div>

      {/* ── Category + Disputes ── */}
      <div className={styles.twoCol}>
        <div className={styles.panel} style={{ marginBottom: 0 }}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Bookings by Category</span>
            <span className={styles.panelSub}>Active + Completed</span>
          </div>
          <div className={styles.catList}>
            {stats.categoryBreakdown.length === 0 ? (
              <span style={{ color: "var(--text-3)", fontSize: 13 }}>No data yet.</span>
            ) : stats.categoryBreakdown.map((c) => (
              <div key={c.category} className={styles.catRow}>
                <div className={styles.catMeta}>
                  <span className={styles.catName}>{CAT_LABELS[c.category] ?? c.category}</span>
                  <span className={styles.catCount}>{c.count}</span>
                </div>
                <div className={styles.catBar}>
                  <div className={styles.catFill} style={{ width: `${(c.count / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel} style={{ marginBottom: 0 }}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Disputes</span>
            <span className={styles.panelSub}>All time</span>
          </div>
          <div className={styles.disputeGrid}>
            <div className={styles.disputeStat}>
              <span className={styles.disputeLabel}>Pending</span>
              <span className={`${styles.disputeValue} ${styles.disputeRed}`}>{stats.disputes.pending}</span>
            </div>
            <div className={styles.disputeStat}>
              <span className={styles.disputeLabel}>Resolved</span>
              <span className={`${styles.disputeValue} ${styles.disputeGreen}`}>{stats.disputes.resolved}</span>
            </div>
          </div>
          {stats.disputes.pending > 0 && (
            <div className={styles.disputeAction}>
              <button className={styles.disputeBtn} onClick={() => router.push("/dashboard/admin/disputes")}>
                Review {stats.disputes.pending} open {stats.disputes.pending === 1 ? "dispute" : "disputes"} →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Bookings ── */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Recent Bookings</span>
          <span className={styles.panelSub}>Latest 8</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Borrower</th>
                <th>Amount</th>
                <th>Platform Fee</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBookings.map((b) => (
                <tr key={b.id}>
                  <td className={styles.tdTruncate}>{b.listing.title}</td>
                  <td>{b.borrower.name}</td>
                  <td className={styles.tdMono}>{fmt(b.totalAmount)}</td>
                  <td className={styles.tdMono}>{b.platformFee != null ? fmt(b.platformFee) : <span className={styles.tdMuted}>—</span>}</td>
                  <td>
                    <span className={`${styles.badge} ${STATUS_BADGE[b.status] ?? ""}`}>
                      {b.status.toLowerCase()}
                    </span>
                  </td>
                  <td className={styles.tdMuted}>
                    {new Date(b.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top Listings + Recent Users ── */}
      <div className={styles.twoCol} style={{ marginBottom: 0 }}>
        <div className={styles.panel} style={{ marginBottom: 0 }}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Top Listings</span>
            <span className={styles.panelSub}>By booking count</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Bookings</th>
                </tr>
              </thead>
              <tbody>
                {stats.topListings.map((l, i) => (
                  <tr key={l.id}>
                    <td><span className={rankClass(i)}>{i + 1}</span></td>
                    <td className={styles.tdTruncate}>{l.title}</td>
                    <td className={styles.tdMuted}>{CAT_LABELS[l.category] ?? l.category}</td>
                    <td className={styles.tdMono}>{l._count.bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.panel} style={{ marginBottom: 0 }}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Recent Sign-ups</span>
            <span className={styles.panelSub}>Latest 5</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>KYC Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span style={{ fontWeight: 500, color: "var(--text-1)" }}>{u.name}</span>
                      {u.surname && <span className={styles.tdMuted}> {u.surname}</span>}
                    </td>
                    <td>
                      <div className={styles.kycRow}>
                        <span className={`${styles.dot} ${
                          u.idVerificationStatus === "verified" ? styles.dotGreen :
                          u.idVerificationStatus === "pending"  ? styles.dotGold  : styles.dotGrey
                        }`} />
                        <span className={styles.tdMuted}>{u.idVerificationStatus}</span>
                      </div>
                    </td>
                    <td className={styles.tdMuted}>
                      {new Date(u.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
