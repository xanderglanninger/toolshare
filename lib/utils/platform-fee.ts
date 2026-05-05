/**
 * Platform service fee: 5%–10% of the rental total.
 *
 * Both price per day and duration contribute equally:
 *   - priceScore: 0 at R300/day, 1 at R1 000/day+
 *   - durationScore: 0 at 1 day, 1 at 30 days+
 * Combined score (0–1) maps linearly onto the 5%–10% range.
 */
export function calculatePlatformFee(
  pricePerDay: number,
  days: number,
  rentalTotal: number
): { feePercent: number; feeAmount: number } {
  const priceScore    = Math.min(1, Math.max(0, (pricePerDay - 300) / 700));
  const durationScore = Math.min(1, Math.max(0, (days - 1) / 29));
  const score         = 0.5 * priceScore + 0.5 * durationScore;

  const feePercent = 5 + 5 * score;
  const feeAmount  = Math.round(rentalTotal * (feePercent / 100) * 100) / 100;

  return { feePercent, feeAmount };
}
