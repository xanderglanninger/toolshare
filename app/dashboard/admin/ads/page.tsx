"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./ads.module.css";

interface Ad {
  id: string;
  title: string;
  tagline: string | null;
  imageUrl: string | null;
  linkUrl: string;
  ctaText: string;
  priceText: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  title: "",
  tagline: "",
  imageUrl: "",
  linkUrl: "",
  ctaText: "Learn More",
  priceText: "",
  startsAt: "",
  endsAt: "",
};

export default function AdminAdsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [ads, setAds]           = useState<Ad[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ads");
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:     form.title,
          tagline:   form.tagline   || null,
          imageUrl:  form.imageUrl  || null,
          linkUrl:   form.linkUrl,
          ctaText:   form.ctaText   || "Learn More",
          priceText: form.priceText || null,
          startsAt:  form.startsAt  || null,
          endsAt:    form.endsAt    || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create ad");
      }
      setForm(EMPTY_FORM);
      fetchAds();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ad: Ad) {
    await fetch(`/api/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !ad.active }),
    });
    fetchAds();
  }

  async function deleteAd(id: string) {
    if (!confirm("Delete this ad?")) return;
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    fetchAds();
  }

  if (status === "loading" || loading) {
    return <div className={styles.loading}>Loading ads…</div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Sponsored Ads</h1>
      <p className={styles.sub}>Ads appear every 6 listings in Today's Picks.</p>

      {/* Create form */}
      <form className={styles.form} onSubmit={handleCreate}>
        <h2 className={styles.formTitle}>New Ad</h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Title *</span>
            <input className={styles.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Summer Sale — 20% off tools" />
          </label>
          <label className={styles.field}>
            <span>Tagline</span>
            <input className={styles.input} value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Short supporting text" />
          </label>
          <label className={styles.field}>
            <span>Image URL</span>
            <input className={styles.input} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://…" />
          </label>
          <label className={styles.field}>
            <span>Link URL *</span>
            <input className={styles.input} value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} required placeholder="https://…" />
          </label>
          <label className={styles.field}>
            <span>CTA Text</span>
            <input className={styles.input} value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} placeholder="Learn More" />
          </label>
          <label className={styles.field}>
            <span>Price text</span>
            <input className={styles.input} value={form.priceText} onChange={e => setForm(f => ({ ...f, priceText: e.target.value }))} placeholder="From R500 / day" />
          </label>
          <label className={styles.field}>
            <span>Starts at</span>
            <input className={styles.input} type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Ends at</span>
            <input className={styles.input} type="datetime-local" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
          </label>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.saveBtn} type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create Ad"}
        </button>
      </form>

      {/* Existing ads */}
      <div className={styles.adList}>
        {ads.length === 0 && <p className={styles.empty}>No ads yet.</p>}
        {ads.map((ad) => (
          <div key={ad.id} className={`${styles.adRow} ${ad.active ? "" : styles.inactive}`}>
            {ad.imageUrl && (
              <img src={ad.imageUrl} alt={ad.title} className={styles.adThumb} />
            )}
            <div className={styles.adInfo}>
              <p className={styles.adTitle}>{ad.title}</p>
              {ad.tagline && <p className={styles.adTagline}>{ad.tagline}</p>}
              <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className={styles.adLink}>{ad.linkUrl}</a>
            </div>
            <div className={styles.adActions}>
              <button
                className={`${styles.toggleBtn} ${ad.active ? styles.activeBtn : styles.inactiveBtn}`}
                onClick={() => toggleActive(ad)}
              >
                {ad.active ? "Active" : "Paused"}
              </button>
              <button className={styles.deleteBtn} onClick={() => deleteAd(ad.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
