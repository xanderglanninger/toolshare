"use client";

import React, { useMemo, useEffect, useState, cloneElement } from "react";
import { ClipboardList, CheckCircle, HardHat, XCircle, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import styles from "./Overview.module.css";
import type { MessageThread, BookingWithDetails } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type MonthPoint = { month: string; year: number; amount: number };
type ListingBreakdown = { listingId: string; title: string; bookings: number; earned: number };

type EarningsData = {
  totalEarned: number;
  totalBookings: number;
  avgPerBooking: number;
  activeListings: number;
  activeBookings: number;
  pendingRequests: number;
  percentageChange: number | null;
  monthly: MonthPoint[];
  byListing: ListingBreakdown[];
};

// ── SVG helpers ───────────────────────────────────────────────────────────────

function smoothPath(pts: { x: number; y: number }[]) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

function RevenueChart({ data }: { data: MonthPoint[] }) {
  const VW = 480, VH = 150;
  const pad = { t: 10, r: 8, b: 20, l: 32 };
  const cW = VW - pad.l - pad.r;
  const cH = VH - pad.t - pad.b;
  const maxV = Math.max(...data.map((d) => d.amount), 1);
  const step = data.length > 1 ? cW / (data.length - 1) : cW;

  const pts = data.map((d, i) => ({
    x: pad.l + i * step,
    y: pad.t + cH - (d.amount / maxV) * cH,
    ...d,
  }));

  const line = pts.length > 1 ? smoothPath(pts) : `M ${pts[0]?.x ?? 0} ${pts[0]?.y ?? pad.t + cH}`;
  const area = `${line} L ${pts[pts.length - 1].x},${pad.t + cH} L ${pts[0].x},${pad.t + cH} Z`;
  const gridFracs = [0.25, 0.5, 0.75, 1];

  const fmtK = (v: number) => v >= 1000 ? `R${(v / 1000).toFixed(1)}k` : `R${v}`;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={styles.chartSvg} aria-label="Monthly revenue chart">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f5a800" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f5a800" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {gridFracs.map((f) => {
        const gy = pad.t + cH - f * cH;
        return (
          <g key={f}>
            <line x1={pad.l} y1={gy} x2={VW - pad.r} y2={gy} stroke="#2a2720" strokeWidth="0.6" />
            <text x={pad.l - 5} y={gy + 3} textAnchor="end" fill="#4a453c" fontSize="6" fontFamily="Inter, sans-serif">
              {fmtK(Math.round(maxV * f / 100) * 100)}
            </text>
          </g>
        );
      })}

      <line x1={pad.l} y1={pad.t + cH} x2={VW - pad.r} y2={pad.t + cH} stroke="#2a2720" strokeWidth="0.6" />
      <path d={area} fill="url(#revGrad)" />
      <path d={line} fill="none" stroke="#f5a800" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {pts.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={3}   fill="#f5a800" />
          <circle cx={p.x} cy={p.y} r={1.8} fill="#1e1c18" />
        </g>
      ))}

      {pts.map((p) => (
        <text key={p.month} x={p.x} y={VH - 6} textAnchor="middle" fill="#5a5448" fontSize="7" fontFamily="Inter, sans-serif">
          {p.month}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ rented, available }: { rented: number; available: number }) {
  const segments = [
    { label: "Rented Out", value: rented,    color: "#f5a800" },
    { label: "Available",  value: available, color: "#22c55e" },
  ];
  const total = rented + available;
  const R = 36, CX = 50, CY = 50, SW = 13;
  const circumference = 2 * Math.PI * R;
  let cumulative = 0;

  return (
    <svg viewBox="0 0 100 100" className={styles.donutSvg} aria-label="Equipment utilization">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#26231e" strokeWidth={SW} />
      {total === 0 ? (
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#26231e" strokeWidth={SW} />
      ) : (
        segments.map((seg) => {
          const dashLen = (seg.value / total) * circumference;
          const dashOffset = circumference - cumulative;
          cumulative += dashLen;
          return (
            <circle
              key={seg.label}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={SW}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          );
        })
      )}
      <text x={CX} y={CY - 4}  textAnchor="middle" fill="#f5f0e8" fontSize="16" fontWeight="700" fontFamily="Inter, sans-serif">{total}</text>
      <text x={CX} y={CY + 9}  textAnchor="middle" fill="#5a5448" fontSize="7"  fontFamily="Inter, sans-serif">listings</text>
    </svg>
  );
}

// ── Activity helpers ──────────────────────────────────────────────────────────

type ActivityType = "booking" | "message" | "done" | "request";

type ActivityItem = {
  id: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  time: string;
  timestamp: number;
  type: ActivityType;
};

function fmtShortDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function deriveActivity(
  ownerBookings: BookingWithDetails[],
  borrowerBookings: BookingWithDetails[],
  threads: MessageThread[],
  myId: string,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const b of ownerBookings) {
    const who  = `${b.borrower.name} ${b.borrower.surname}`;
    const when = `${fmtShortDate(b.startDate)} – ${fmtShortDate(b.endDate)}`;
    let icon: React.ReactNode, title: string, sub: string, type: ActivityType;
    switch (b.status) {
      case "PENDING":   icon = <ClipboardList size={14} />; title = `New request: ${b.listing.title}`;     sub = `${who} · ${when}`;          type = "request"; break;
      case "CONFIRMED": icon = <CheckCircle size={14} />;   title = `${b.listing.title} confirmed`;         sub = `${who} · ${when}`;          type = "done";    break;
      case "ACTIVE":    icon = <HardHat size={14} />;       title = `${b.listing.title} active`;            sub = `Rented to ${who}`;          type = "booking"; break;
      case "COMPLETED": icon = <CheckCircle size={14} />;   title = `${b.listing.title} returned`;          sub = `${who} · booking complete`; type = "done";    break;
      case "CANCELLED": icon = <XCircle size={14} />;       title = `Booking cancelled: ${b.listing.title}`; sub = who;                       type = "request"; break;
      default: continue;
    }
    items.push({ id: `owner-${b.id}`, icon, title, sub, type, timestamp: new Date(b.updatedAt).getTime(), time: "" });
  }

  for (const b of borrowerBookings) {
    const when = `${fmtShortDate(b.startDate)} – ${fmtShortDate(b.endDate)}`;
    let icon: React.ReactNode, title: string, sub: string, type: ActivityType;
    switch (b.status) {
      case "PENDING":   icon = <ClipboardList size={14} />; title = `Booking pending: ${b.listing.title}`;   sub = `Awaiting confirmation · ${when}`; type = "request"; break;
      case "CONFIRMED": icon = <CheckCircle size={14} />;   title = `Booking confirmed: ${b.listing.title}`;  sub = when;                              type = "done";    break;
      case "ACTIVE":    icon = <HardHat size={14} />;       title = `Active rental: ${b.listing.title}`;      sub = when;                              type = "booking"; break;
      case "COMPLETED": icon = <CheckCircle size={14} />;   title = `Rental complete: ${b.listing.title}`;    sub = when;                              type = "done";    break;
      case "CANCELLED": icon = <XCircle size={14} />;       title = `Booking cancelled: ${b.listing.title}`; sub = when;                              type = "request"; break;
      default: continue;
    }
    items.push({ id: `borrower-${b.id}`, icon, title, sub, type, timestamp: new Date(b.updatedAt).getTime(), time: "" });
  }

  for (const t of threads) {
    if (!t.lastMessage || t.lastMessage.senderId === myId) continue;
    const other = t.participants.find((p) => p.userId !== myId);
    if (!other) continue;
    const name    = `${other.user.name} ${other.user.surname}`;
    const preview = t.lastMessage.body.length > 60 ? t.lastMessage.body.slice(0, 60) + "…" : t.lastMessage.body;
    items.push({
      id: `thread-${t.id}`, icon: <MessageCircle size={14} />, title: `Message from ${name}`, sub: preview,
      type: "message", timestamp: t.lastMessageAt ? new Date(t.lastMessageAt).getTime() : 0, time: "",
    });
  }

  const sorted = items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  return sorted.map((item) => ({ ...item, time: relativeTime(new Date(item.timestamp)) }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function threadInitials(thread: MessageThread, myId: string): string {
  const other = thread.participants.find((p) => p.userId !== myId);
  if (!other) return "?";
  return `${other.user.name?.[0] ?? ""}${other.user.surname?.[0] ?? ""}`.toUpperCase();
}

function threadName(thread: MessageThread, myId: string): string {
  const other = thread.participants.find((p) => p.userId !== myId);
  if (!other) return "Unknown";
  return `${other.user.name} ${other.user.surname}`;
}

// ── Main component ────────────────────────────────────────────────────────────

interface OverviewProps {
  onNavigate?: (tab: string) => void;
  onOpenThread?: (threadId: string) => void;
}

export default function Overview({ onNavigate, onOpenThread }: OverviewProps) {
  const { data: session } = useSession();
  const myId = session?.user?.id ?? "";
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/earnings")
      .then((r) => r.json())
      .then((json) => { if (!json.error) setEarnings(json.data); })
      .catch(() => {})
      .finally(() => setEarningsLoading(false));
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/messages")
      .then((r) => r.json())
      .then((json) => { if (json.data) setThreads(json.data); })
      .catch(() => {})
      .finally(() => setThreadsLoading(false));
  }, [session?.user?.id]);

  const [ownerBookings, setOwnerBookings]       = useState<BookingWithDetails[]>([]);
  const [borrowerBookings, setBorrowerBookings] = useState<BookingWithDetails[]>([]);
  const [activityLoading, setActivityLoading]   = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    Promise.all([
      fetch("/api/bookings?role=owner").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
    ])
      .then(([ownerJson, borrowerJson]) => {
        if (ownerJson.data)    setOwnerBookings(ownerJson.data);
        if (borrowerJson.data) setBorrowerBookings(borrowerJson.data);
      })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [session?.user?.id]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const today = new Date().toLocaleDateString("en-ZA", {
    weekday: "long", month: "long", day: "numeric",
  });

  const navigate = onNavigate ?? (() => {});

  const totalRevenue = earnings?.monthly.reduce((s, d) => s + d.amount, 0) ?? 0;
  const activeListings  = earnings?.activeListings  ?? 0;
  const activeBookings  = earnings?.activeBookings  ?? 0;
  const pendingRequests = earnings?.pendingRequests ?? 0;
  const totalEarned     = earnings?.totalEarned ?? 0;
  const pct             = earnings?.percentageChange;

  const topGear = earnings?.byListing.slice(0, 4) ?? [];
  const topGearMax = topGear[0]?.earned ?? 1;

  const rentedOut  = activeBookings;
  const available  = Math.max(0, activeListings - rentedOut);
  const utilisation = activeListings > 0 ? Math.round((rentedOut / activeListings) * 100) : 0;

  const fmtMoney = (n: number) =>
    `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const STATS: {
    label: string; value: string; delta: string;
    up: boolean | null; accent: string; icon: React.ReactNode;
  }[] = [
    {
      label: "Active Listings",
      value: earningsLoading ? "—" : String(activeListings),
      delta: earningsLoading ? "" : `${activeListings} available now`,
      up: null, accent: "#f5a800",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      label: "Total Earned",
      value: earningsLoading ? "—" : fmtMoney(totalEarned),
      delta: earningsLoading
        ? ""
        : pct !== null && pct !== undefined
          ? `${pct >= 0 ? "+" : ""}${pct}% vs last month`
          : "No comparison yet",
      up: pct != null ? pct > 0 : null, accent: "#22c55e",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      ),
    },
    {
      label: "Active Bookings",
      value: earningsLoading ? "—" : String(activeBookings),
      delta: earningsLoading ? "" : activeBookings > 0 ? "Currently rented out" : "None active",
      up: null, accent: "#3b82f6",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
    {
      label: "Pending Requests",
      value: earningsLoading ? "—" : String(pendingRequests),
      delta: earningsLoading ? "" : pendingRequests > 0 ? "Needs your response" : "All caught up",
      up: null, accent: "#f43f5e",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
    },
  ];

  const revenueData: MonthPoint[] =
    earnings?.monthly.length
      ? earnings.monthly
      : [{ month: "—", year: new Date().getFullYear(), amount: 0 }];

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.heroDate}>{today}</p>
          <h1 className={styles.heroTitle}>{greeting}, {firstName}</h1>
          <p className={styles.heroSub}>Here's what's happening with your equipment today.</p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.actionBtn} onClick={() => navigate("create")}>
            + Add Listing
          </button>
          <button className={styles.actionBtnGhost} onClick={() => navigate("earnings")}>
            View Earnings →
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={styles.statsGrid}>
        {STATS.map((s, i) => (
          <div key={i} className={styles.statCard} style={{ "--card-accent": s.accent } as React.CSSProperties}>
            <div className={styles.statCardBody}>
              <p className={styles.statLabel}>{s.label}</p>
              <p className={styles.statValue}>{s.value}</p>
              {s.up === true  && <span className={styles.trendUp}>↑ {s.delta}</span>}
              {s.up === false && <span className={styles.trendDown}>↓ {s.delta}</span>}
              {s.up === null  && <span className={styles.trendNeutral}>{s.delta}</span>}
            </div>
            <div className={styles.statIconWrap}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className={styles.chartsRow}>

        {/* Revenue trend */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelTitle}>Revenue Trend</p>
              <p className={styles.panelSub}>
                Last 6 months · Total{" "}
                <strong>
                  {earningsLoading ? "…" : `R ${totalRevenue.toLocaleString()}`}
                </strong>
              </p>
            </div>
            <button className={styles.panelLink} onClick={() => navigate("earnings")}>
              Full report →
            </button>
          </div>
          <RevenueChart data={revenueData} />
        </div>

        {/* Right column: donut + top earners */}
        <div className={styles.chartsSide}>

          {/* Utilization donut */}
          <div className={styles.panel}>
            <p className={styles.panelTitle}>Fleet Utilization</p>
            <div className={styles.donutWrap}>
              <DonutChart rented={rentedOut} available={available} />
              <div className={styles.donutLegend}>
                <div className={styles.legendRow}>
                  <span className={styles.legendDot} style={{ background: "#f5a800" }} />
                  <span className={styles.legendLabel}>Rented Out</span>
                  <span className={styles.legendVal}>{earningsLoading ? "—" : rentedOut}</span>
                </div>
                <div className={styles.legendRow}>
                  <span className={styles.legendDot} style={{ background: "#22c55e" }} />
                  <span className={styles.legendLabel}>Available</span>
                  <span className={styles.legendVal}>{earningsLoading ? "—" : available}</span>
                </div>
                <div className={styles.legendSep} />
                <div className={styles.legendRow}>
                  <span className={styles.legendLabel} style={{ color: "var(--text-3)" }}>Utilisation</span>
                  <span className={styles.legendVal} style={{ color: "#f5a800" }}>
                    {earningsLoading ? "—" : `${utilisation}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top earners */}
          <div className={styles.panel}>
            <p className={styles.panelTitle}>Top Earners</p>
            <div className={styles.topGearList}>
              {earningsLoading ? (
                <div className={styles.topGearSkeleton} />
              ) : topGear.length === 0 ? (
                <p className={styles.topGearEmpty}>No earnings yet</p>
              ) : (
                topGear.map((g) => (
                  <div key={g.listingId} className={styles.topGearRow}>
                    <div className={styles.topGearInfo}>
                      <span className={styles.topGearName}>{g.title}</span>
                      <span className={styles.topGearEarned}>{fmtMoney(g.earned)}</span>
                    </div>
                    <div className={styles.topGearBar}>
                      <div
                        className={styles.topGearFill}
                        style={{ width: `${(g.earned / topGearMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Activity + Messages ── */}
      <div className={styles.twoCol}>

        {/* Activity */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Recent Activity</p>
            <button className={styles.panelLink} onClick={() => navigate("bookings")}>View all →</button>
          </div>
          <div className={styles.timeline}>
            {activityLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.activitySkeleton} />
              ))
            ) : (() => {
              const items = deriveActivity(ownerBookings, borrowerBookings, threads, myId);
              return items.length === 0 ? (
                <p className={styles.activityEmpty}>No recent activity yet.</p>
              ) : (
                items.map((a, i) => (
                  <div key={a.id} className={styles.timelineRow}>
                    <div className={styles.timelineTrack}>
                      <span className={`${styles.timelineDot} ${styles[`dot_${a.type}` as keyof typeof styles]}`} />
                      {i < items.length - 1 && <span className={styles.timelineLine} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineEmoji}>{a.icon}</span>
                      <div className={styles.timelineText}>
                        <p className={styles.timelineTitle}>{a.title}</p>
                        <p className={styles.timelineSub}>{a.sub}</p>
                      </div>
                      <span className={styles.timelineTime}>{a.time}</span>
                    </div>
                  </div>
                ))
              );
            })()}
          </div>
        </div>

        {/* Messages */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Messages</p>
            <div className={styles.panelHeadRight}>
              {(() => {
                const unread = threads.reduce((n, t) => n + t.unreadCount, 0);
                return unread > 0 ? (
                  <span className={styles.unreadBadge}>{unread} unread</span>
                ) : null;
              })()}
              <button className={styles.panelLink} onClick={() => navigate("messages")}>View all →</button>
            </div>
          </div>
          <div className={styles.msgList}>
            {threadsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.msgSkeleton} />
              ))
            ) : threads.length === 0 ? (
              <p className={styles.msgEmpty}>No conversations yet.</p>
            ) : (
              threads.slice(0, 3).map((t) => {
                const unread = t.unreadCount > 0;
                return (
                  <div
                    key={t.id}
                    className={`${styles.msgRow} ${unread ? styles.msgUnread : ""}`}
                    onClick={() => onOpenThread ? onOpenThread(t.id) : navigate("messages")}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={`${styles.msgAvatar} ${unread ? styles.msgAvatarUnread : ""}`}>
                      {threadInitials(t, myId)}
                    </div>
                    <div className={styles.msgBody}>
                      <div className={styles.msgHeader}>
                        <span className={`${styles.msgFrom} ${unread ? styles.msgFromUnread : ""}`}>
                          {threadName(t, myId)}
                        </span>
                        <span className={styles.msgTime}>{relativeTime(t.lastMessageAt)}</span>
                      </div>
                      <p className={`${styles.msgPreview} ${unread ? styles.msgPreviewUnread : ""}`}>
                        {t.subject ? <em className={styles.msgSubject}>{t.subject} · </em> : null}
                        {t.lastMessage?.body ?? "No messages yet"}
                      </p>
                    </div>
                    {unread && <span className={styles.unreadDot} />}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
