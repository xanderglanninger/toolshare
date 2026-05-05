"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./kyc.module.css";

type KycUser = {
  id: string;
  name: string;
  surname: string | null;
  email: string;
  idNumber: string | null;
  selfieUrl: string | null;
  idPhotoUrl: string | null;
  idVerificationStatus: string;
  createdAt: string;
};

export default function AdminKycPage() {
  const { status } = useSession();
  const router = useRouter();

  const [users,    setUsers]    = useState<KycUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    fetch("/api/admin/kyc")
      .then(r => r.json())
      .then(j => {
        if (j.error === "Forbidden") { router.replace("/dashboard"); return; }
        setUsers(j.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, router]);

  async function decide(userId: string, action: "approve" | "reject") {
    setActing(userId);
    try {
      const res  = await fetch("/api/admin/kyc", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, idVerificationStatus: data.data.idVerificationStatus } : u
      ));
    } catch (err: any) {
      alert(err.message ?? "Something went wrong.");
    } finally {
      setActing(null);
    }
  }

  const pending  = users.filter(u => u.idVerificationStatus === "pending");
  const rejected = users.filter(u => u.idVerificationStatus === "rejected");

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.empty}>Loading…</div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Admin</p>
        <h1 className={styles.title}>KYC Verifications</h1>
        <p className={styles.sub}>Review submitted identity documents and approve or reject each user.</p>
      </div>

      {users.length === 0 && (
        <div className={styles.empty}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>No pending verifications</span>
        </div>
      )}

      {pending.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Pending <span className={styles.count}>{pending.length}</span>
          </h2>
          <div className={styles.list}>
            {pending.map(u => (
              <KycCard key={u.id} user={u} acting={acting} onDecide={decide} onView={setLightbox} />
            ))}
          </div>
        </section>
      )}

      {rejected.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Rejected <span className={styles.countRed}>{rejected.length}</span>
          </h2>
          <div className={styles.list}>
            {rejected.map(u => (
              <KycCard key={u.id} user={u} acting={acting} onDecide={decide} onView={setLightbox} />
            ))}
          </div>
        </section>
      )}

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Document" className={styles.lightboxImg} onClick={e => e.stopPropagation()} />
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

function KycCard({ user, acting, onDecide, onView }: {
  user: KycUser;
  acting: string | null;
  onDecide: (id: string, action: "approve" | "reject") => void;
  onView: (url: string) => void;
}) {
  const isActing  = acting === user.id;
  const isPending = user.idVerificationStatus === "pending";

  return (
    <div className={styles.card}>
      {/* Photos */}
      <div className={styles.photos}>
        <div className={styles.docSlot} onClick={() => user.selfieUrl && onView(user.selfieUrl)}>
          {user.selfieUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={user.selfieUrl} alt="Selfie" className={styles.docImg} />
            : <div className={styles.docMissing}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <span>No selfie</span>
              </div>}
          <div className={styles.docLabel}>Selfie</div>
        </div>
        <div className={styles.docSlot} onClick={() => user.idPhotoUrl && onView(user.idPhotoUrl)}>
          {user.idPhotoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={user.idPhotoUrl} alt="ID" className={styles.docImg} />
            : <div className={styles.docMissing}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                <span>No ID</span>
              </div>}
          <div className={styles.docLabel}>SA ID</div>
        </div>
      </div>

      {/* Info + actions */}
      <div className={styles.body}>
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <span className={styles.userName}>{user.name} {user.surname ?? ""}</span>
            <span className={`${styles.statusBadge} ${isPending ? styles.badgePending : styles.badgeRejected}`}>
              {isPending ? "Pending" : "Rejected"}
            </span>
          </div>
          <p className={styles.userEmail}>{user.email}</p>
          {user.idNumber && <p className={styles.userId}>ID: {user.idNumber}</p>}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnApprove}
            disabled={isActing}
            onClick={() => onDecide(user.id, "approve")}
          >
            {isActing ? "…" : "✓ Approve"}
          </button>
          <button
            className={styles.btnReject}
            disabled={isActing}
            onClick={() => onDecide(user.id, "reject")}
          >
            {isActing ? "…" : "✕ Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
