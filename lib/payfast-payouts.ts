import crypto from "crypto";

const PAYFAST_PAYOUTS_BASE =
  process.env.PAYFAST_SANDBOX === "true"
    ? "https://api.payfast.co.za/adhoc"
    : "https://api.payfast.co.za/adhoc";

// PayFast Ad-hoc Payments (Payouts) API
// Docs: https://developers.payfast.co.za/api#tag/Adhoc-Payments
// Requires merchant to have Payouts enabled on their PayFast account.

interface PayoutParams {
  listerId: string;
  payoutId: string; // DailyPayout.id used as idempotency key
  amount: number; // ZAR, two decimal places
  bankAccountHolder: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountType: string; // cheque | savings | transmission
  bankBranchCode: string;
  reference: string; // appears on bank statement
}

interface PayoutResult {
  success: boolean;
  reference?: string;
  error?: string;
}

function buildPayoutsSignature(params: Record<string, string>, passphrase: string): string {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v.trim() !== "")
  );
  const parts = Object.entries(filtered).map(
    ([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, "+")}`
  );
  let str = parts.join("&");
  if (passphrase) str += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

export async function sendPayout(params: PayoutParams): Promise<PayoutResult> {
  const merchantId  = process.env.PAYFAST_MERCHANT_ID!;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY!;
  const passphrase  = process.env.PAYFAST_PASSPHRASE ?? "";

  const now = new Date().toISOString();

  const body: Record<string, string> = {
    "merchant-id":         merchantId,
    version:               "v1",
    timestamp:             now,
    "beneficiary-name":    params.bankAccountHolder,
    "account-number":      params.bankAccountNumber,
    "account-type":        params.bankAccountType,
    "branch-code":         params.bankBranchCode,
    "bank-name":           params.bankName,
    amount:                (params.amount * 100).toFixed(0), // cents
    description:           params.reference,
    reference:             params.payoutId,
  };

  const signature = buildPayoutsSignature(body, passphrase);
  body.signature = signature;

  const res = await fetch(`${PAYFAST_PAYOUTS_BASE}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "merchant-id": merchantId,
      version: "v1",
      timestamp: now,
      signature,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`[payfast-payouts] Error ${res.status}:`, text);
    return { success: false, error: `HTTP ${res.status}: ${text}` };
  }

  try {
    const json = JSON.parse(text);
    return { success: true, reference: json.data?.reference ?? params.payoutId };
  } catch {
    return { success: true, reference: params.payoutId };
  }
}
