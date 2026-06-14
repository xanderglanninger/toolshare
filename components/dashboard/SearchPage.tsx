"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Monitor, Wrench, Tent, Car, Shirt, Sofa, Music, BookOpen,
  Gamepad2, Camera, PartyPopper, Package, ArrowLeft, X,
} from "lucide-react";
import styles from "./SearchPage.module.css";
import type { Listing, ListingCategory } from "@/lib/types/listing";

const CATEGORY_ICONS: Record<ListingCategory, React.ReactElement> = {
  ELECTRONICS:          <Monitor size={18} />,
  TOOLS_EQUIPMENT:      <Wrench size={18} />,
  SPORTS_OUTDOORS:      <Tent size={18} />,
  VEHICLES:             <Car size={18} />,
  CLOTHING_ACCESSORIES: <Shirt size={18} />,
  FURNITURE_HOME:       <Sofa size={18} />,
  MUSICAL_INSTRUMENTS:  <Music size={18} />,
  BOOKS_MEDIA:          <BookOpen size={18} />,
  GAMES_TOYS:           <Gamepad2 size={18} />,
  CAMERAS_PHOTOGRAPHY:  <Camera size={18} />,
  PARTY_EVENTS:         <PartyPopper size={18} />,
  OTHER:                <Package size={18} />,
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  ELECTRONICS:          "Electronics",
  TOOLS_EQUIPMENT:      "Tools",
  SPORTS_OUTDOORS:      "Sports",
  VEHICLES:             "Vehicles",
  CLOTHING_ACCESSORIES: "Clothing",
  FURNITURE_HOME:       "Furniture",
  MUSICAL_INSTRUMENTS:  "Music",
  BOOKS_MEDIA:          "Books",
  GAMES_TOYS:           "Games",
  CAMERAS_PHOTOGRAPHY:  "Cameras",
  PARTY_EVENTS:         "Events",
  OTHER:                "Other",
};

const CATEGORIES = Object.keys(CATEGORY_ICONS) as ListingCategory[];
const PAGE_SIZE = 12;

export default function SearchPage() {
  const router = useRouter();

  const [query, setQuery]                   = useState("");
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState<ListingCategory | null>(null);
  const [items, setItems]                   = useState<Listing[]>([]);
  const [loading, setLoading]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [hasMore, setHasMore]               = useState(false);
  const inputRef                            = useRef<HTMLInputElement>(null);
  const sentinelRef                         = useRef<HTMLDivElement>(null);
  const pageRef                             = useRef(1);
  const loadingRef                          = useRef(false);
  const hasMoreRef                          = useRef(false);
  const searchRef                           = useRef("");
  const categoryRef                         = useRef<ListingCategory | null>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
        available: "true",
      });
      if (categoryRef.current) params.set("category", categoryRef.current);
      if (searchRef.current)   params.set("search", searchRef.current);

      const res  = await fetch(`/api/listings?${params}`);
      const json = await res.json();
      const raw: Listing[] = json.data ?? [];
      const more = json.pagination?.totalPages != null
        ? pageNum < json.pagination.totalPages
        : raw.length === PAGE_SIZE;

      hasMoreRef.current = more;
      setHasMore(more);
      setItems((prev) => reset ? raw : [...prev, ...raw]);
    } catch {
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    searchRef.current   = search;
    categoryRef.current = activeCategory;
    pageRef.current     = 1;
    hasMoreRef.current  = true;
    if (search || activeCategory) fetchPage(1, true);
    else setItems([]);
  }, [search, activeCategory, fetchPage]);

  // Infinite scroll
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

  const hasQuery = query || activeCategory;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.searchBar}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Search listings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery("")} aria-label="Clear">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className={styles.chips}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.chip} ${activeCategory === cat ? styles.chipActive : ""}`}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            <span className={styles.chipIcon}>{CATEGORY_ICONS[cat]}</span>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className={styles.results}>
        {!hasQuery ? (
          <div className={styles.prompt}>
            <p className={styles.promptTitle}>What are you looking for?</p>
            <p className={styles.promptSub}>Type above or pick a category</p>
          </div>
        ) : loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No results</p>
            <p className={styles.emptySub}>Try a different search or category</p>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {items.map((listing) => {
                const [imgFailed, setImgFailed] = [false, () => {}];
                const thumb = listing.images?.[0];
                return (
                  <div
                    key={listing.id}
                    className={styles.card}
                    onClick={() => router.push(`/listings/${listing.id}`)}
                  >
                    <div className={styles.cardImg}>
                      {thumb ? (
                        <img src={thumb} alt={listing.title} className={styles.cardImgEl} loading="lazy" />
                      ) : (
                        <div className={styles.cardImgPlaceholder}>
                          {CATEGORY_ICONS[listing.category] ?? <Package size={28} />}
                        </div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardPrice}>
                        R {Number(listing.pricePerDay).toLocaleString("en-ZA")}
                        <span className={styles.cardPriceSub}>/day</span>
                      </p>
                      <p className={styles.cardTitle}>{listing.title}</p>
                      <p className={styles.cardCity}>{listing.city}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {loadingMore && (
              <div className={styles.spinnerWrap}><div className={styles.spinner} /></div>
            )}
          </>
        )}
        <div ref={sentinelRef} />
      </div>
    </div>
  );
}
