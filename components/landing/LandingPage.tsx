"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import styles from "./landing.module.css";
import { ArrowUpRight, Heart } from "lucide-react";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { n: "01", name: "Cameras & Video",   sub: "DSLRs, lenses, gimbals, lighting rigs",   category: "CAMERAS_PHOTOGRAPHY" },
  { n: "02", name: "Power Tools",       sub: "Drills, saws, grinders, compressors",      category: "TOOLS_EQUIPMENT"     },
  { n: "03", name: "Bikes & Vehicles",  sub: "Road bikes, e-scooters, cargo bikes",      category: "VEHICLES"            },
  { n: "04", name: "Music Gear",        sub: "Guitars, PA systems, mixers, keyboards",   category: "MUSICAL_INSTRUMENTS" },
  { n: "05", name: "Outdoor & Camping", sub: "Tents, sleeping bags, hiking equipment",   category: "SPORTS_OUTDOORS"     },
  { n: "06", name: "Electronics",       sub: "Monitors, GPUs, gaming gear, projectors",  category: "ELECTRONICS"         },
  { n: "07", name: "Sports Equipment",  sub: "Weights, rackets, boards, helmets",        category: "SPORTS_OUTDOORS"     },
  { n: "08", name: "Lighting",          sub: "Studio lights, LED panels, ring lights",   category: "ELECTRONICS"         },
];

type ShowcaseListing = {
  id: string;
  src: string;
  name: string;
  price: string;
  cat: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRONICS: "Electronics", TOOLS_EQUIPMENT: "Tools & Equipment",
  SPORTS_OUTDOORS: "Sports & Outdoors", VEHICLES: "Vehicles",
  CLOTHING_ACCESSORIES: "Clothing", FURNITURE_HOME: "Furniture & Home",
  MUSICAL_INSTRUMENTS: "Music Gear", BOOKS_MEDIA: "Books & Media",
  GAMES_TOYS: "Games & Toys", CAMERAS_PHOTOGRAPHY: "Cameras",
  PARTY_EVENTS: "Party & Events", OTHER: "Other",
};

const STEPS = [
  { n: "01", title: "Browse listings",     desc: "Search by category, location, or keyword to find exactly what you need from people nearby." },
  { n: "02", title: "Book & pay securely", desc: "Pick your dates, send a request, and pay through our secure checkout — no cash, no hassle." },
  { n: "03", title: "Pick up & use",       desc: "Meet the owner, grab the item, and use it. Return it when you're done, just as agreed." },
  { n: "04", title: "List your own gear",  desc: "Turn idle equipment into passive income. Create a listing in minutes and start earning today." },
];

const STATS = [
  { display: "2,400+", count: 2400, suffix: "+", label: "Active listings" },
  { display: "1,800+", count: 1800, suffix: "+", label: "Happy renters"   },
  { display: "4.9★",   count: 4.9,  suffix: "★", label: "Average rating"  },
  { display: "95%",    count: 95,   suffix: "%",  label: "Return rate"     },
];

const MARQUEE_WORDS = [
  "cameras", "power tools", "bikes", "music gear", "tents",
  "electronics", "drills", "lighting", "drones", "projectors",
  "kayaks", "generators", "lenses", "mixers", "trailers",
];

// Characters used in the scramble effect
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&?!";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function scrambleLine(el: HTMLElement, startDelay: number) {
  const finalText = el.textContent ?? "";
  const totalFrames = 38;

  setTimeout(() => {
    let frame = 0;

    const tick = () => {
      frame++;
      const resolved = Math.floor((frame / totalFrames) * finalText.length);

      el.textContent = finalText
        .split("")
        .map((char, i) => {
          if (char === " " || char === ".") return char;
          if (i < resolved) return char;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        })
        .join("");

      if (frame < totalFrames) requestAnimationFrame(tick);
      else el.textContent = finalText;
    };

    requestAnimationFrame(tick);
  }, startDelay);
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const navRef          = useRef<HTMLElement>(null);
  const heroRef         = useRef<HTMLElement>(null);
  const heroParallaxRef = useRef<HTMLDivElement>(null);
  const spotlightRef    = useRef<HTMLDivElement>(null);
  const cursorRef       = useRef<HTMLDivElement>(null);
  const cursorDotRef    = useRef<HTMLDivElement>(null);

  const [showcase, setShowcase] = useState<ShowcaseListing[]>([]);

  useEffect(() => {
    fetch("/api/listings?limit=6&available=true&random=true&countless=true")
      .then((r) => r.json())
      .then((json) => {
        const items: ShowcaseListing[] = (json.data ?? [])
          .filter((l: any) => l.images?.length > 0)
          .slice(0, 6)
          .map((l: any) => ({
            id:    l.id,
            src:   l.images[0],
            name:  l.title,
            price: `R ${Number(l.pricePerDay).toLocaleString("en-ZA")}`,
            cat:   CATEGORY_LABELS[l.category] ?? l.category,
          }));
        setShowcase(items);
      })
      .catch(() => {});
  }, []);

  /* ── Nav border on scroll ── */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => nav.classList.toggle(styles.navScrolled, window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Custom cursor with lerp ── */
  useEffect(() => {
    const cursor    = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    if (!cursor || !cursorDot) return;

    let mx = -200, my = -200;
    let cx = -200, cy = -200;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cursorDot.style.transform = `translate(${mx}px, ${my}px)`;
    };

    const tick = () => {
      cx += (mx - cx) * 0.11;
      cy += (my - cy) * 0.11;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      rafId = requestAnimationFrame(tick);
    };

    const onEnter = () => cursor.classList.add(styles.cursorGrow);
    const onLeave = () => cursor.classList.remove(styles.cursorGrow);

    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);

    const targets = document.querySelectorAll("a, button, [data-cursor]");
    targets.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      targets.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  /* ── Hero mouse spotlight ── */
  useEffect(() => {
    const hero      = heroRef.current;
    const spotlight = spotlightRef.current;
    if (!hero || !spotlight) return;

    let sx = hero.offsetWidth / 2;
    let sy = hero.offsetHeight / 2;
    let cx = sx, cy = sy;
    let rafId: number;
    let entered = false;

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      sx = e.clientX - r.left;
      sy = e.clientY - r.top;
      if (!entered) {
        spotlight.style.opacity = "1";
        entered = true;
      }
    };
    const onLeave = () => {
      spotlight.style.opacity = "0";
      entered = false;
    };

    const tick = () => {
      cx += (sx - cx) * 0.07;
      cy += (sy - cy) * 0.07;
      // offset by half the spotlight size so its centre tracks the cursor
      spotlight.style.transform = `translate(${cx - 400}px, ${cy - 400}px)`;
      rafId = requestAnimationFrame(tick);
    };

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  /* ── Hero mouse parallax (multi-depth) ── */
  useEffect(() => {
    const hero     = heroRef.current;
    const parallax = heroParallaxRef.current;
    if (!hero || !parallax) return;

    let tx = 0, ty = 0;
    let px = 0, py = 0;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width  - 0.5) * 2; // -1 to 1
      ty = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    };
    const onLeave = () => { tx = 0; ty = 0; };

    const tick = () => {
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      parallax.style.transform = `translate(${px * 14}px, ${py * 9}px)`;
      rafId = requestAnimationFrame(tick);
    };

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  /* ── Hero text: slide-up + scramble ── */
  useEffect(() => {
    const lines = document.querySelectorAll<HTMLElement>(`.${styles.heroLineInner}`);
    lines.forEach((el, i) => {
      const slideDelay  = 200 + i * 140;      // matches CSS stagger
      const scrambleAt  = slideDelay + 160;   // starts while line is mid-slide

      setTimeout(() => el.classList.add(styles.lineVisible), slideDelay);
      scrambleLine(el, scrambleAt);
    });
  }, []);

  /* ── Scroll-triggered section reveals ── */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(`.${styles.reveal}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ── Stat counters ── */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-count]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el     = entry.target as HTMLElement;
          const target = parseFloat(el.dataset.count!);
          const suffix = el.dataset.suffix ?? "";
          const isDec  = el.dataset.count!.includes(".");
          const start  = performance.now();
          const dur    = 1600;

          const step = (now: number) => {
            const t     = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const val   = eased * target;
            el.textContent = (isDec ? val.toFixed(1) : Math.floor(val).toLocaleString()) + suffix;
            if (t < 1) requestAnimationFrame(step);
          };

          requestAnimationFrame(step);
          observer.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <>
      {/* Custom cursor */}
      <div ref={cursorRef}    className={styles.cursor}    aria-hidden="true" />
      <div ref={cursorDotRef} className={styles.cursorDot} aria-hidden="true" />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav ref={navRef} className={styles.nav}>
        <Logo size="md" variant="dark" />
        <div className={styles.navRight}>
          <Link href="/login"        className={styles.navLink}>Log in</Link>
          <Link href="/registration" className={styles.navCta}>Get started</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section ref={heroRef} className={styles.hero}>

        {/* Ambient orbs — CSS-animated, no JS */}
        <div className={styles.heroOrb1} aria-hidden="true" />
        <div className={styles.heroOrb2} aria-hidden="true" />
        <div className={styles.heroOrb3} aria-hidden="true" />

        {/* Floating particles */}
        <div className={styles.heroParticles} aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className={styles.particle} style={{ "--pi": i } as React.CSSProperties} />
          ))}
        </div>

        {/* Mouse spotlight — follows cursor with lerp */}
        <div ref={spotlightRef} className={styles.heroSpotlight} aria-hidden="true" />

        {/* Load-time scan line */}
        <div className={styles.heroScanLine} aria-hidden="true" />

        {/* Content — shifts with mouse parallax */}
        <div className={styles.heroInner}>
          <div ref={heroParallaxRef} className={styles.heroParallax}>
            <p className={styles.heroEyebrow}>
              <span className={styles.heroEyebrowDot} />
              Peer-to-peer equipment rentals
            </p>

            <h1 className={styles.heroTitle}>
              <span className={styles.heroLine}>
                <span className={styles.heroLineInner}>Rent anything.</span>
              </span>
              <span className={styles.heroLine}>
                <span className={styles.heroLineInner}>Earn from</span>
              </span>
              <span className={`${styles.heroLine} ${styles.heroLineAccent}`}>
                <span className={styles.heroLineInner}>
                  what you own.<span className={styles.heroCaret} aria-hidden="true" />
                </span>
              </span>
            </h1>
          </div>

          <div className={styles.heroBottom}>
            <p className={styles.heroSub}>
              lendme connects people who need gear with people who have it —
              cameras, tools, bikes, music equipment, and more. No middleman,
              no markups.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/registration" className={styles.ctaPrimary}>
                Start renting free <ArrowUpRight size={16} />
              </Link>
              <Link href={`/login?redirect=${encodeURIComponent("/dashboard")}`} className={styles.ctaSecondary}>
                Browse listings
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={styles.heroScroll} aria-hidden="true">
          <span className={styles.heroScrollLabel}>Scroll</span>
          <div className={styles.heroScrollLine} />
        </div>

        {/* Decorative corner brackets */}
        <div className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
        <div className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />
      </section>

      {/* ── Stats bar ───────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        {STATS.map((s, i) => (
          <div key={s.label} className={`${styles.statItem} ${styles.reveal}`} style={{ transitionDelay: `${i * 0.08}s` }}>
            <span
              className={styles.statValue}
              data-count={s.count}
              data-suffix={s.suffix}
            >
              {s.display}
            </span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Marquee ─────────────────────────────────────────────── */}
      <div className={styles.marqueeStrip} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
            <span key={i} className={styles.marqueeItem}>
              <span className={styles.marqueeDot} />
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* ── Categories ──────────────────────────────────────────── */}
      <section className={styles.catSection}>
        <div className={styles.sectionWrap}>
          <div className={`${styles.catHeader} ${styles.reveal}`}>
            <span className={styles.sectionTag}>What you can rent</span>
            <h2 className={styles.sectionTitle}>Equipment categories</h2>
          </div>

          <ul className={styles.catList}>
            {CATEGORIES.map((c, i) => (
              <li key={c.n} className={`${styles.catRow} ${styles.reveal}`} style={{ transitionDelay: `${i * 0.06}s` }}>
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/dashboard?category=${c.category}`)}`}
                  className={styles.catRowInner}
                >
                  <span className={styles.catNum}>{c.n}</span>
                  <span className={styles.catName}>{c.name}</span>
                  <span className={styles.catSub}>{c.sub}</span>
                  <ArrowUpRight className={styles.catArrow} size={20} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Showcase ────────────────────────────────────────────── */}
      <section className={styles.showcase}>
        <div className={styles.sectionWrap}>
          <div className={`${styles.showcaseHeader} ${styles.reveal}`}>
            <div>
              <span className={styles.sectionTag}>Live listings</span>
              <h2 className={styles.sectionTitle}>Gear available near you</h2>
            </div>
            <Link href={`/login?redirect=${encodeURIComponent("/dashboard")}`} className={styles.showcaseAllLink}>
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className={styles.showcaseGrid}>
            {showcase.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`${styles.showcaseCard} ${styles.showcaseSkeleton}`} />
                ))
              : showcase.map((item, i) => (
                  <Link
                    key={item.id}
                    href={`/login?redirect=${encodeURIComponent(`/listings/${item.id}`)}`}
                    className={`${styles.showcaseCard} ${styles.showcaseCardLoaded}`}
                    style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
                  >
                    <div className={styles.showcaseImgWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.src}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div className={styles.showcaseMeta}>
                      <span className={styles.showcaseCat}>{item.cat}</span>
                      <div className={styles.showcaseNameRow}>
                        <span className={styles.showcaseName}>{item.name}</span>
                        <span className={styles.showcasePrice}>
                          {item.price}<span className={styles.showcasePerDay}>/day</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className={styles.howSection}>
        <div className={`${styles.sectionWrap} ${styles.howInner}`}>
          <div className={`${styles.howLeft} ${styles.reveal}`}>
            <span className={styles.sectionTag}>Process</span>
            <h2 className={styles.sectionTitle}>How it works</h2>
            <p className={styles.howSub}>
              From browsing to booking in minutes. No subscriptions,
              no complicated processes — just gear when you need it.
            </p>
            <Link href="/registration" className={styles.ctaPrimary}>
              Get started <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className={styles.howRight}>
            {STEPS.map((s, i) => (
              <div key={s.n} className={`${styles.stepRow} ${styles.reveal}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                <span className={styles.stepNum}>{s.n}</span>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────── */}
      <section className={styles.ctaBanner}>
        <div className={`${styles.ctaInner} ${styles.reveal}`}>
          <p className={styles.ctaEyebrow}>Start earning today</p>
          <h2 className={styles.ctaTitle}>
            Your gear is sitting idle.{" "}
            <em className={styles.ctaAccent}>Start earning.</em>
          </h2>
          <div className={styles.ctaActions}>
            <Link href="/registration" className={styles.ctaPrimary}>
              Create a free account <ArrowUpRight size={16} />
            </Link>
            <Link href="/login" className={styles.ctaGhost}>
              I already have an account
            </Link>
          </div>
          <div className={styles.ctaTrustRow}>
            {["No setup fees", "Cancel anytime", "Instant payouts"].map((t) => (
              <span key={t} className={styles.ctaTrustItem}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Logo size="md" variant="dark" />
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <Link href={`/login?redirect=${encodeURIComponent("/dashboard")}`} className={styles.footerLink}>Browse</Link>
            <Link href="/registration"                                         className={styles.footerLink}>List gear</Link>
            <Link href="/login"                                                className={styles.footerLink}>Log in</Link>
            <Link href="/registration"                                         className={styles.footerLink}>Sign up</Link>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 lendme. All rights reserved.</span>
          <span className={styles.footerMade}>
            Made with <Heart size={12} fill="currentColor" style={{ color: "#ef4444" }} /> for makers everywhere.
          </span>
        </div>
      </footer>
    </>
  );
}
