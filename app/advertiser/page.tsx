import Link from "next/link";
import styles from "./landing.module.css";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    days: 30,
    price: 499,
    features: ["30-day campaign", "Native listing placement", "Unlimited impressions", "Click-through tracking"],
    highlight: false,
  },
  {
    id: "growth",
    name: "Growth",
    days: 60,
    price: 899,
    features: ["60-day campaign", "Native listing placement", "Unlimited impressions", "Click-through tracking", "Priority placement"],
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    days: 90,
    price: 1299,
    features: ["90-day campaign", "Native listing placement", "Unlimited impressions", "Click-through tracking", "Priority placement", "Dedicated support"],
    highlight: false,
  },
];

export default function AdvertiserLandingPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Advertise on LendMe</p>
        <h1 className={styles.heroTitle}>Reach thousands of active renters</h1>
        <p className={styles.heroSub}>
          Your brand appears as a native listing in Today's Picks — the most-viewed feed on LendMe.
          No banners, no pop-ups. Just seamless, high-converting exposure.
        </p>
        <Link href="/advertiser/create" className={styles.heroCta}>Start a campaign →</Link>
      </section>

      {/* How it works */}
      <section className={styles.howSection}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.steps}>
          {[
            { n: "01", title: "Create your ad", body: "Add your title, image, tagline, and the URL you want to drive traffic to." },
            { n: "02", title: "Pick a plan", body: "Choose how long you want your ad to run. Longer campaigns get better placement." },
            { n: "03", title: "Pay securely", body: "Pay via Paystack. Your ad goes live the moment payment is confirmed." },
            { n: "04", title: "Get seen", body: "Your ad appears every 6 listings in Today's Picks, looking just like a real item." },
          ].map((s) => (
            <div key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricingSection}>
        <h2 className={styles.sectionTitle}>Pricing</h2>
        <div className={styles.plans}>
          {PLANS.map((plan) => (
            <div key={plan.id} className={`${styles.planCard} ${plan.highlight ? styles.planHighlight : ""}`}>
              {plan.highlight && <span className={styles.popularBadge}>Most popular</span>}
              <p className={styles.planName}>{plan.name}</p>
              <div className={styles.planPrice}>
                <span className={styles.planCurrency}>R</span>
                <span className={styles.planAmount}>{plan.price.toLocaleString("en-ZA")}</span>
              </div>
              <p className={styles.planDuration}>{plan.days} days</p>
              <ul className={styles.planFeatures}>
                {plan.features.map((f) => (
                  <li key={f} className={styles.planFeature}>
                    <span className={styles.featureCheck}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/advertiser/create?plan=${plan.id}`}
                className={`${styles.planCta} ${plan.highlight ? styles.planCtaHighlight : ""}`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to grow your business?</h2>
        <p className={styles.ctaSub}>Join local businesses already reaching LendMe's audience.</p>
        <Link href="/advertiser/create" className={styles.heroCta}>Create your first ad →</Link>
      </section>
    </div>
  );
}
