"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Monitor, Wrench, Tent, Car, Shirt, Sofa, Music, BookOpen,
  Gamepad2, Camera, PartyPopper, Package, Search, SlidersHorizontal,
  ChevronUp, ChevronDown,
} from "lucide-react";
import styles from "./TodaysPicks.module.css";
import type { Listing, ListingCategory } from "@/lib/types/listing";

const CATEGORY_ICONS: Record<ListingCategory, React.ReactElement> = {
  ELECTRONICS:           <Monitor size={28} />,
  TOOLS_EQUIPMENT:       <Wrench size={28} />,
  SPORTS_OUTDOORS:       <Tent size={28} />,
  VEHICLES:              <Car size={28} />,
  CLOTHING_ACCESSORIES:  <Shirt size={28} />,
  FURNITURE_HOME:        <Sofa size={28} />,
  MUSICAL_INSTRUMENTS:   <Music size={28} />,
  BOOKS_MEDIA:           <BookOpen size={28} />,
  GAMES_TOYS:            <Gamepad2 size={28} />,
  CAMERAS_PHOTOGRAPHY:   <Camera size={28} />,
  PARTY_EVENTS:          <PartyPopper size={28} />,
  OTHER:                 <Package size={28} />,
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  ELECTRONICS:           "Electronics",
  TOOLS_EQUIPMENT:       "Tools",
  SPORTS_OUTDOORS:       "Sports",
  VEHICLES:              "Vehicles",
  CLOTHING_ACCESSORIES:  "Clothing",
  FURNITURE_HOME:        "Furniture",
  MUSICAL_INSTRUMENTS:   "Music",
  BOOKS_MEDIA:           "Books",
  GAMES_TOYS:            "Games",
  CAMERAS_PHOTOGRAPHY:   "Cameras",
  PARTY_EVENTS:          "Events",
  OTHER:                 "Other",
};

const CATEGORIES = Object.keys(CATEGORY_ICONS) as ListingCategory[];
const PAGE_SIZE = 12;

// ─── Sub-components ──────────────────────────────────────────────────────────

function ListingCard({ listing, onClick }: { listing: Listing; onClick: () => void }) {
  const icon = CATEGORY_ICONS[listing.category] ?? <Package size={28} />;
  const [imgFailed, setImgFailed] = React.useState(false);
  const hasImage = listing.images && listing.images.length > 0 && !imgFailed;

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardImg}>
        {hasImage ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className={styles.cardImgEl}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={styles.cardImgPlaceholder}>
            <span className={styles.cardImgIcon}>{icon}</span>
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardPriceGroup}>
          <span className={styles.cardPrice}>
            R {Number(listing.pricePerDay).toLocaleString("en-ZA")}
            <span className={styles.cardPriceSub}>/day</span>
          </span>
          {listing.pricePerWeek && (
            <span className={styles.cardWeekPrice}>
              R {Number(listing.pricePerWeek).toLocaleString("en-ZA")}/wk
            </span>
          )}
        </div>
        <p className={styles.cardTitle}>{listing.title}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.cardSkeleton}>
      <div className={styles.skeletonImg} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} style={{ width: "75%" }} />
        <div className={styles.skeletonLine} style={{ width: "45%" }} />
        <div className={styles.skeletonLine} style={{ width: "55%" }} />
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TodaysPicks() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlCategory = searchParams.get("category") as ListingCategory | null;
  const initialCategory = urlCategory && CATEGORIES.includes(urlCategory) ? urlCategory : null;

  const [items, setItems]                     = useState<Listing[]>([]);
  const [hasMore, setHasMore]                 = useState(true);
  const [initialLoading, setInitialLoading]   = useState(true);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [searchInput, setSearchInput]         = useState("");
  const [search, setSearch]                   = useState("");
  const [activeCategory, setActiveCategory]   = useState<ListingCategory | null>(initialCategory);
  const [filterOpen, setFilterOpen]           = useState(false);
  const [searchOpen, setSearchOpen]           = useState(false);
  const filterRef                             = useRef<HTMLDivElement>(null);
  const searchInputRef                        = useRef<HTMLInputElement>(null);

  // Refs so the IntersectionObserver callback never captures stale state
  const sentinelRef   = useRef<HTMLDivElement>(null);
  const pageRef       = useRef(1);
  const loadingRef    = useRef(false);
  const hasMoreRef    = useRef(true);
  const searchRef     = useRef("");
  const categoryRef   = useRef<ListingCategory | null>(null);

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (reset) setInitialLoading(true);
    else       setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page:      String(pageNum),
        limit:     String(PAGE_SIZE),
        available: "true",
        countless: pageNum > 1 ? "true" : "false",
        random:    "true",
      });
      if (categoryRef.current) params.set("category", categoryRef.current);
      if (searchRef.current)   params.set("search",   searchRef.current);

      const res  = await fetch(`/api/listings?${params}`);
      const json = await res.json();
      const raw: Listing[]  = json.data ?? [];
      const pagination      = json.pagination;

      const more = pagination?.totalPages != null
        ? pageNum < pagination.totalPages
        : raw.length === PAGE_SIZE;

      hasMoreRef.current = more;
      setHasMore(more);
      setItems((prev) => reset ? raw : [...prev, ...raw]);
    } catch {
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Re-fetch from page 1 whenever filters change
  useEffect(() => {
    searchRef.current   = search;
    categoryRef.current = activeCategory;
    pageRef.current     = 1;
    hasMoreRef.current  = true;
    fetchPage(1, true);
  }, [search, activeCategory, fetchPage]);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Infinite scroll — re-attaches after every fetch so the observer sees the
  // sentinel's updated position once the grid has expanded.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          const next = pageRef.current + 1;
          pageRef.current = next;
          fetchPage(next);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage, items]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Header row: title + search + filter */}
      <div className={styles.pageHead}>
        <div>
          <p className={styles.pageSub}>Browse</p>
          <h1 className={styles.pageTitle}>Today's Picks</h1>
        </div>
        <div className={styles.headControls}>
          {/* Search — icon collapses/expands */}
          <div className={`${styles.searchWrap} ${searchOpen ? styles.searchOpen : ""}`}>
            <button
              className={styles.searchIconBtn}
              onClick={() => {
                setSearchOpen((o) => {
                  if (!o) setTimeout(() => searchInputRef.current?.focus(), 10);
                  else setSearchInput("");
                  return !o;
                })
              }}
              aria-label="Toggle search"
            >
              <Search size={15} />
            </button>
            <input
              ref={searchInputRef}
              className={styles.searchInput}
              type="text"
              placeholder="Search listings…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={() => { if (!searchInput) setSearchOpen(false); }}
            />
            {searchInput && (
              <button
                className={styles.searchClear}
                onClick={() => { setSearchInput(""); setSearchOpen(false); }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {/* Filter — icon-only, expands on click */}
          <div className={styles.filterWrap} ref={filterRef}>
        <button
          className={`${styles.filterBtn} ${activeCategory ? styles.filterBtnActive : ""} ${filterOpen ? styles.filterBtnOpen : ""}`}
          onClick={() => setFilterOpen((o) => !o)}
          aria-label="Filter by category"
        >
          <SlidersHorizontal size={14} />
          <span className={`${styles.filterLabel} ${filterOpen || activeCategory ? styles.filterLabelVisible : ""}`}>
            {activeCategory ? CATEGORY_LABELS[activeCategory] : "Filter"}
          </span>
          <span className={`${styles.filterChevron} ${filterOpen || activeCategory ? styles.filterChevronVisible : ""}`}>
            {filterOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </button>
        {filterOpen && (
          <div className={styles.filterDropdown}>
            <button
              className={`${styles.filterOption} ${activeCategory === null ? styles.filterOptionActive : ""}`}
              onClick={() => { setActiveCategory(null); setFilterOpen(false); }}
            >
              All categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`${styles.filterOption} ${activeCategory === cat ? styles.filterOptionActive : ""}`}
                onClick={() => { setActiveCategory(cat); setFilterOpen(false); }}
              >
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </button>
            ))}

          </div>
        )}
          </div>
          <Link href="/dashboard/create" className={styles.createBtn}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Create listing
          </Link>
        </div>
      </div>

      {/* Content */}
      {initialLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><Search size={40} /></span>
          <p className={styles.emptyTitle}>No listings found</p>
          <p className={styles.emptySub}>Try a different search or category</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {items.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => router.push(`/listings/${listing.id}`)}
              />
            ))}
          </div>
          {loadingMore && <LoadingSpinner />}
        </>
      )}

      {/* Scroll sentinel — IntersectionObserver watches this */}
      <div ref={sentinelRef} className={styles.sentinel} />

      {!hasMore && items.length > 0 && !initialLoading && (
        <p className={styles.endMessage}>You've seen everything — check back later for new listings!</p>
      )}
    </div>
  );
}
