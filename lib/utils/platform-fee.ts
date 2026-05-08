export const PLATFORM_FEE_PERCENT = 10;
export const VAT_PERCENT = 15;

export function calculatePlatformFee(
  _pricePerDay: number,
  _days: number,
  rentalTotal: number
): { feePercent: number; feeAmount: number } {
  const feeAmount = Math.round(rentalTotal * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  return { feePercent: PLATFORM_FEE_PERCENT, feeAmount };
}

export function calculateVat(rentalTotal: number): number {
  return Math.round(rentalTotal * (VAT_PERCENT / 100) * 100) / 100;
}

// Full breakdown for a booking
export function calculateBookingAmounts(pricePerDay: number, days: number): {
  rentalAmount: number;
  vatAmount: number;
  platformFee: number;
  totalAmount: number;
} {
  const rentalAmount = Math.round(days * pricePerDay * 100) / 100;
  const { feeAmount: platformFee } = calculatePlatformFee(pricePerDay, days, rentalAmount);
  const vatAmount    = calculateVat(rentalAmount + platformFee);
  const totalAmount  = Math.round((rentalAmount + platformFee + vatAmount) * 100) / 100;
  return { rentalAmount, vatAmount, platformFee, totalAmount };
}
