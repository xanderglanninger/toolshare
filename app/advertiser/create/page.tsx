"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./create.module.css";

const PLANS = [
  { id: "starter", name: "Starter", days: 30,  price: 499,  desc: "Perfect for testing the waters" },
  { id: "growth",  name: "Growth",  days: 60,  price: 899,  desc: "Our most popular option" },
  { id: "pro",     name: "Pro",     days: 90,  price: 1299, desc: "Maximum exposure" },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

function CreateCampaignContent() {
  const { data: session, status } = useSession();
  const router      = useRouter();
  const searchParams = useSearchParams();

  const defaultPlan = (searchParams.get("plan") as PlanId) ?? "growth";

  const [title,     setTitle]     = useState("");
  const [tagline,   setTagline]   = useState("");
  const [imageUrl,  setImageUrl]  = useState("");
  const [linkUrl,   setLinkUrl]   = useState("");
  const [ctaText,   setCtaText]   = useState("Learn More");
  const [priceText, setPriceText] = useState("");
  const [planId,    setPlanId]    = useState<PlanId>(PLANS.find(p => p.id === defaultPlan) ? defaultPlan : "growth");

  const [step,    setStep]    = useState<"details" | "review">("details");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const selectedPlan = PLANS.find((p) => p.id === planId)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "details") { setStep("review"); return; }

    setSaving(true);
    setError(null);
    try {
      // 1. Create the ad
      const createRes = await fetch("/api/advertiser/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, tagline: tagline || null, imageUrl: imageUrl || null, linkUrl, ctaText, priceText: priceText || null, planId }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error ?? "Failed to create ad");
      }
      const ad = await createRes.json();

      // 2. Initiate Paystack checkout
      const checkoutRes = await fetch(`/api/advertiser/ads/${ad.id}/checkout`, { method: "POST" });
      if (!checkoutRes.ok) {
        const err = await checkoutRes.json();
        throw new Error(err.error ?? "Failed to initiate checkout");
      }
      const { data } = await checkoutRes.json();

      // 3. Redirect to Paystack
      window.location.href = data.authorization_url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  if (status === "loading") return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>New Campaign</p>
        <h1 className={styles.title}>Create your ad</h1>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {step === "details" && (
          <>
            {/* Ad details */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ad details</h2>
              <div className={styles.fields}>
                <label className={styles.field}>
                  <span className={styles.label}>Headline *</span>
                  <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Hire a generator — from R300/day" />
                  <span className={styles.hint}>Shown as the listing title</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Tagline</span>
                  <input className={styles.input} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short supporting text below the title" />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Image URL</span>
                  <input className={styles.input} value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" />
                  <span className={styles.hint}>Use a direct image link (JPG/PNG). Recommended: 3:2 ratio.</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Destination URL *</span>
                  <input className={styles.input} value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required placeholder="https://yourwebsite.co.za" type="url" />
                  <span className={styles.hint}>Where clicks go</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Price text</span>
                  <input className={styles.input} value={priceText} onChange={e => setPriceText(e.target.value)} placeholder="From R300 / day" />
                  <span className={styles.hint}>Shown where the listing price normally appears</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>CTA button text</span>
                  <input className={styles.input} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Learn More" />
                </label>
              </div>
            </section>

            {/* Plan selection */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Choose a plan</h2>
              <div className={styles.plans}>
                {PLANS.map((plan) => (
                  <button
                    type="button"
                    key={plan.id}
                    className={`${styles.planCard} ${planId === plan.id ? styles.planSelected : ""}`}
                    onClick={() => setPlanId(plan.id)}
                  >
                    <div className={styles.planTop}>
                      <span className={styles.planName}>{plan.name}</span>
                      <span className={styles.planDays}>{plan.days} days</span>
                    </div>
                    <div className={styles.planPrice}>R {plan.price.toLocaleString("en-ZA")}</div>
                    <div className={styles.planDesc}>{plan.desc}</div>
                    {planId === plan.id && <span className={styles.planCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </section>

            <button type="submit" className={styles.nextBtn} disabled={!title || !linkUrl}>
              Review order →
            </button>
          </>
        )}

        {step === "review" && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Review your order</h2>

            <div className={styles.preview}>
              <div className={styles.previewImgWrap}>
                {imageUrl ? (
                  <img src={imageUrl} alt={title} className={styles.previewImg} />
                ) : (
                  <div className={styles.previewImgEmpty}>No image</div>
                )}
                <span className={styles.sponsoredBadge}>Sponsored</span>
              </div>
              <div className={styles.previewBody}>
                <p className={styles.previewPrice}>{priceText || ctaText + " →"}</p>
                <p className={styles.previewTitle}>{title}</p>
                {tagline && <p className={styles.previewTagline}>{tagline}</p>}
              </div>
            </div>

            <div className={styles.orderSummary}>
              <div className={styles.orderRow}>
                <span>Plan</span>
                <span>{selectedPlan.name} ({selectedPlan.days} days)</span>
              </div>
              <div className={styles.orderRow}>
                <span>Amount</span>
                <span className={styles.orderTotal}>R {selectedPlan.price.toLocaleString("en-ZA")}</span>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.reviewActions}>
              <button type="button" className={styles.backBtn} onClick={() => setStep("details")}>← Back</button>
              <button type="submit" className={styles.payBtn} disabled={saving}>
                {saving ? "Redirecting to Paystack…" : `Pay R ${selectedPlan.price.toLocaleString("en-ZA")} with Paystack`}
              </button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}

export default function CreateCampaignPage() {
  return (
    <Suspense>
      <CreateCampaignContent />
    </Suspense>
  );
}
