"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import styles from "./MyListings.module.css";
import Spinner from "@/components/ui/Spinner";
import { useDashboard } from "@/app/dashboard/context";

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
  const { idVerificationStatus, hasBankAccount, setShowListingGate } = useDashboard();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings?ownerId=${session.user.id}&limit=50`);
      const json = await res.json();
      setListings(json.data ?? []);
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
          onClick={() => {
            const idDone = idVerificationStatus === "verified" || idVerificationStatus === "pending";
            if (!idDone || !hasBankAccount) { setShowListingGate(true); return; }
            router.push("/dashboard/create");
          }}
        >+ Add Listing</button>
      </div>

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
