"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./users.module.css";

type AdminUser = {
  id: string;
  name: string;
  surname: string | null;
  email: string;
  role: string;
  image: string | null;
  idVerificationStatus: string;
  createdAt: string;
  _count: { listings: number; borrowedBookings: number };
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [acting,  setActing]  = useState<string | null>(null);

  const load = useCallback((q: string) => {
    setLoading(true);
    fetch(`/api/admin/users?search=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(j => {
        if (j.error === "Forbidden") { router.replace("/dashboard"); return; }
        setUsers(j.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { if (status !== "loading") load(""); }, [status, load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  async function setRole(userId: string, role: "ADMIN" | "USER") {
    setActing(userId);
    try {
      const res  = await fetch("/api/admin/users", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: data.data.role } : u));
    } catch (err: any) {
      alert(err.message ?? "Something went wrong.");
    } finally {
      setActing(null);
    }
  }

  const admins  = users.filter(u => u.role === "ADMIN");
  const members = users.filter(u => u.role !== "ADMIN");

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Admin</p>
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.sub}>Search users and manage admin roles.</p>
      </div>

      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className={styles.searchInput}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : (
        <>
          {admins.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Admins <span className={styles.countAmber}>{admins.length}</span>
              </h2>
              <div className={styles.list}>
                {admins.map(u => <UserRow key={u.id} user={u} acting={acting} currentId={session?.user?.id} onSetRole={setRole} />)}
              </div>
            </section>
          )}

          {members.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Members <span className={styles.countGrey}>{members.length}</span>
              </h2>
              <div className={styles.list}>
                {members.map(u => <UserRow key={u.id} user={u} acting={acting} currentId={session?.user?.id} onSetRole={setRole} />)}
              </div>
            </section>
          )}

          {users.length === 0 && (
            <div className={styles.empty}>No users found.</div>
          )}
        </>
      )}
    </div>
  );
}

function UserRow({ user, acting, currentId, onSetRole }: {
  user: AdminUser;
  acting: string | null;
  currentId?: string;
  onSetRole: (id: string, role: "ADMIN" | "USER") => void;
}) {
  const isActing = acting === user.id;
  const isSelf   = user.id === currentId;
  const isAdmin  = user.role === "ADMIN";

  const chipClass =
    user.idVerificationStatus === "verified" ? styles.verifiedChip :
    user.idVerificationStatus === "pending"  ? styles.pendingChip  :
    user.idVerificationStatus === "rejected" ? styles.rejectedChip : styles.unverifiedChip;

  const chipLabel =
    user.idVerificationStatus === "verified"  ? "✓ Verified"  :
    user.idVerificationStatus === "pending"   ? "Pending"     :
    user.idVerificationStatus === "rejected"  ? "Rejected"    : "Unverified";

  const initials = `${user.name?.[0] ?? ""}${user.surname?.[0] ?? ""}`.toUpperCase();

  return (
    <div className={styles.row}>
      <div className={styles.avatar}>
        {user.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={user.image} alt="" className={styles.avatarImg} />
          : initials}
      </div>

      <div className={styles.userMeta}>
        <span className={styles.userName}>
          {user.name} {user.surname ?? ""}
          {isSelf && <span className={styles.youBadge}>you</span>}
        </span>
        <span className={styles.userEmail}>{user.email}</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{user._count.listings}</span>
          <span className={styles.statLabel}>Listings</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{user._count.borrowedBookings}</span>
          <span className={styles.statLabel}>Bookings</span>
        </div>
      </div>

      <span className={`${styles.chip} ${chipClass}`}>{chipLabel}</span>

      {isAdmin ? (
        <button
          className={styles.btnDemote}
          disabled={isActing || isSelf}
          onClick={() => onSetRole(user.id, "USER")}
          title={isSelf ? "Cannot remove your own admin role" : "Remove admin"}
        >
          {isActing ? "…" : "Remove admin"}
        </button>
      ) : (
        <button
          className={styles.btnPromote}
          disabled={isActing}
          onClick={() => onSetRole(user.id, "ADMIN")}
        >
          {isActing ? "…" : "Make admin"}
        </button>
      )}
    </div>
  );
}
