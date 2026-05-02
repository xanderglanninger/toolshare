"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";
import Logo from "@/components/ui/Logo";

const slides = [
  {
    title: "Your idle gear earns money",
    subtitle: "List your excavators, scaffolding, cranes & more. Get paid while they sit.",
  },
  {
    title: "Borrow what the job needs",
    subtitle: "Access verified heavy equipment near your site — daily or weekly rates.",
  },
  {
    title: "Built for the trades",
    subtitle: "Every owner is verified. Every piece of kit is insured. Job-ready, every time.",
  },
];

const mockItems = [
  { icon: "🚛", bg: "#2e2820", w: 88, badge: "Available", cls: styles.bAvail },
  { icon: "⚙️", bg: "#2a2820", w: 72, badge: "Booked",    cls: styles.bBooked },
  { icon: "🏗️", bg: "#28302a", w: 82, badge: "Available", cls: styles.bAvail },
  { icon: "🦺", bg: "#302820", w: 66, badge: "Available", cls: styles.bAvail },
];

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [tick, setTick]               = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [tick]);

  const goToSlide = (i: number) => {
    setActiveSlide(i);
    setTick((t) => t + 1);
  };

  const handleSubmit = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(redirectTo);
  };

  const handleGoogle = async () => {
    await signIn("google", { callbackUrl: redirectTo });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* ── Left: form ── */}
        <div className={styles.left}>
          <Logo size="md" />

          <div className={styles.formArea}>
            <p className={styles.formEyebrow}>Equipment lending platform</p>
            <h1 className={styles.formTitle}>
              Sign in to<br />your account
            </h1>

            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className={styles.forgot}>
              <a href="#">Forgot password?</a>
            </div>

            <button
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>

            <div className={styles.divider}>or</div>

            <button className={styles.btnGoogle} onClick={handleGoogle}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <p className={styles.footerLink}>
            No account yet? <a href={`/registration?redirect=${encodeURIComponent(redirectTo)}`}>Register free</a>
          </p>
        </div>

        {/* ── Right: showcase ── */}
        <div className={styles.right}>
          <div className={styles.shapes}>
            <div className={styles.gearRing} />
            <div className={styles.gearAccent} />
            <div className={styles.hex} />
            <div className={styles.diag} />
            <div className={`${styles.bolt} ${styles.b1}`} />
            <div className={`${styles.bolt} ${styles.b2}`} />
            <div className={`${styles.bolt} ${styles.b3}`} />
          </div>

          <div className={styles.screenMock}>
            <div className={styles.screenHeader}>
              <span className={styles.screenTitleLabel}>Nearby gear</span>
              <div className={styles.dotsRow}>
                <div className={`${styles.dot} ${styles.dotR}`} />
                <div className={`${styles.dot} ${styles.dotY}`} />
                <div className={`${styles.dot} ${styles.dotG}`} />
              </div>
            </div>
            <div className={styles.screenBody}>
              {mockItems.map((item, i) => (
                <div key={i} className={styles.sRow}>
                  <div className={styles.sThumb} style={{ background: item.bg }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                  </div>
                  <div className={styles.sText}>
                    <div className={styles.sLabel} style={{ width: `${item.w}%` }} />
                    <div className={styles.sSub} />
                  </div>
                  <span className={`${styles.sBadge} ${item.cls}`}>{item.badge}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.slideContent}>
            <p className={styles.slideEyebrow}>LendMe — for the trades</p>
            <p className={styles.slideTitle}>{slides[activeSlide].title}</p>
            <p className={styles.slideSub}>{slides[activeSlide].subtitle}</p>
            <div className={styles.slideDots}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.slideDot}${i === activeSlide ? " " + styles.active : ""}`}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div key={`${activeSlide}-${tick}`} className={styles.progressBar} />
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}