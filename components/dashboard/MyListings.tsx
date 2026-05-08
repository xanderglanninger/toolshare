"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import styles from "./MyListings.module.css";
import Spinner from "@/components/ui/Spinner";

type Listing = {
  id: string;
  title: string;
  category: string;
  pricePerDay: number;
  isAvailable: boolean;
  images: string[];
};

type Props = {
  onEdit: (id: string) => void;
};

export default function MyListings({ onEdit }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [hasBankAccount, setHasBankAccount] = useState<boolean | null>(null);

  const fetchListings = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [listRes, bankRes] = await Promise.all([
        fetch(`/api/listings?ownerId=${session.user.id}&limit=50`),
        fetch("/api/settings/bank-account"),
      ]);
      const listJson = await listRes.json();
      const bankJson = await bankRes.json();
      setListings(listJson.data ?? []);
      const b = bankJson.data;
      setHasBankAccount(!!(b?.bankAccountHolder && b?.bankName && b?.bankAccountNumber && b?.bankAccountType));
    } catch {
      setError("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const toggleAvailability = async (id: string) => {
    setTogglingId(id);
    await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleAvailability: true }),
    });
    await fetchListings();
    setTogglingId(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Your gear</p>
          <h1 className={styles.pageTitle}>My Listings</h1>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => router.push("/dashboard?tab=create")}
          disabled={hasBankAccount === false}
          title={hasBankAccount === false ? "Add a bank account in Settings before creating a listing" : undefined}
        >+ Add Listing</button>
      </div>

      {hasBankAccount === false && (
        <div style={{ margin: "1rem 0", padding: "0.875rem 1rem", borderRadius: "8px", background: "var(--amber-50, #fffbeb)", border: "1px solid var(--amber-200, #fde68a)", color: "var(--amber-800, #92400e)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>You need to <button onClick={() => router.push("/dashboard?tab=settings")} style={{ background: "none", border: "none", padding: 0, color: "inherit", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>add a bank account</button> in Settings before you can create listings.</span>
        </div>
      )}

      {loading && <p style={{ padding: "2rem" }}>Loading…</p>}
      {error   && <p style={{ padding: "2rem", color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div className={styles.grid}>
          {listings.map((item) => (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardThumb}>
                {item.images[0] ? (
                  <img src={item.images[0]} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className={styles.cardEmoji}><Package size={36} /></span>
                )}
                <span className={`${styles.cardBadge} ${item.isAvailable ? styles.badgeAvail : styles.badgeBooked}`}>
                  {item.isAvailable ? "available" : "unavailable"}
                </span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardCategory}>{item.category}</p>
                <p className={styles.cardName}>{item.title}</p>
                <p className={styles.cardRate}>R {item.pricePerDay}/day</p>
              </div>
              <div className={styles.cardFooter}>
                <button
                  className={`${styles.toggleBtn} ${item.isAvailable ? styles.toggleAvail : styles.toggleBooked}`}
                  onClick={() => toggleAvailability(item.id)}
                  disabled={togglingId === item.id}
                >
                  {togglingId === item.id && <Spinner />}
                  {togglingId === item.id
                    ? item.isAvailable ? "Marking…" : "Marking…"
                    : item.isAvailable ? "Mark Unavailable" : "Mark Available"}
                </button>
                <button className={styles.editBtn} onClick={() => onEdit(item.id)}>
                  Edit
                </button>
              </div>
            </div>
          ))}

          {listings.length === 0 && (
            <div className={styles.addCard}>
              <span className={styles.addIcon}>+</span>
              <p className={styles.addLabel}>No listings yet</p>
              <p className={styles.addSub}>Create a listing to start earning</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
