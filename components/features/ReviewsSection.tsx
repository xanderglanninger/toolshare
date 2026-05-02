"use client";

import { useEffect, useState } from "react";
import styles from "./ReviewsSection.module.css";
import type { ListingReviewSummary, Review } from "@/lib/types";

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <span className={size === "lg" ? styles.starsLg : styles.starsSm}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={rating >= s ? styles.starOn : styles.starOff}>★</span>
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials =
    (review.reviewer.name?.[0] ?? "").toUpperCase() +
    (review.reviewer.surname?.[0] ?? "").toUpperCase();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>
          {review.reviewer.image
            ? <img src={review.reviewer.image} alt="" className={styles.avatarImg} />
            : <span>{initials}</span>}
        </div>
        <div className={styles.cardMeta}>
          <p className={styles.reviewerName}>{review.reviewer.name} {review.reviewer.surname}</p>
          <p className={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString("en-ZA", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        </div>
        <Stars rating={review.rating} />
      </div>
      {review.comment && <p className={styles.comment}>{review.comment}</p>}
    </div>
  );
}

export default function ReviewsSection({ listingId }: { listingId: string }) {
  const [summary, setSummary] = useState<ListingReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reviews?listingId=${listingId}`)
      .then((r) => r.json())
      .then((json) => setSummary(json.data ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) return <div className={styles.loading}>Loading reviews…</div>;
  if (!summary || summary.count === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>★</span>
        <p className={styles.emptyText}>No reviews yet. Be the first to book this item!</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.aggregate}>
        <span className={styles.bigRating}>{summary.averageRating.toFixed(1)}</span>
        <div className={styles.aggregateRight}>
          <Stars rating={Math.round(summary.averageRating)} size="lg" />
          <p className={styles.reviewCount}>{summary.count} review{summary.count !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className={styles.list}>
        {summary.reviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
    </div>
  );
}
