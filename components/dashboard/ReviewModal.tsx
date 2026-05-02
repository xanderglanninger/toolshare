"use client";

import { useState } from "react";
import styles from "./ReviewModal.module.css";
import type { BookingWithDetails } from "@/lib/types";

interface Props {
  booking: BookingWithDetails;
  currentUserId: string;
  onClose: () => void;
  onSubmitted: (bookingId: string) => void;
}

export default function ReviewModal({ booking, currentUserId, onClose, onSubmitted }: Props) {
  const isLender = booking.listing.owner.id === currentUserId;
  const reviewedUser = isLender ? booking.borrower : booking.listing.owner;

  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit() {
    if (rating === 0) { setError("Please select a star rating."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId:  booking.id,
          reviewedId: reviewedUser.id,
          listingId:  booking.listing.id,
          rating,
          comment: comment.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit review");
      onSubmitted(booking.id);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const display = hovered || rating;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <p className={styles.eyebrow}>Review</p>
        <h2 className={styles.title}>How was your experience?</h2>

        <div className={styles.subjectRow}>
          <div className={styles.avatar}>
            {reviewedUser.image
              ? <img src={reviewedUser.image} alt="" className={styles.avatarImg} />
              : <span>{(reviewedUser.name[0] ?? "").toUpperCase()}{(reviewedUser.surname[0] ?? "").toUpperCase()}</span>
            }
          </div>
          <div>
            <p className={styles.subjectName}>{reviewedUser.name} {reviewedUser.surname}</p>
            <p className={styles.subjectRole}>{isLender ? "Borrower" : "Lender"} · {booking.listing.title}</p>
          </div>
        </div>

        <div className={styles.stars} onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              className={`${styles.star}${display >= s ? " " + styles.starFilled : ""}`}
              onMouseEnter={() => setHovered(s)}
              onClick={() => setRating(s)}
              type="button"
            >
              ★
            </button>
          ))}
        </div>

        {display > 0 && (
          <p className={styles.ratingLabel}>{RATING_LABELS[display]}</p>
        )}

        <textarea
          className={styles.textarea}
          placeholder="Share more about your experience (optional)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={600}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.submitBtn}
          disabled={submitting || rating === 0}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};
