import crypto from "crypto";

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? "";
export const PAYSTACK_BASE_URL = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return Boolean(PAYSTACK_SECRET_KEY);
}

export function paystackHeaders() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

// Initialize a transaction — returns { authorization_url, access_code, reference }
export async function initializeTransaction(params: {
  email: string;
  amount: number; // ZAR, will be converted to kobo (cents * 100)
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100), // kobo
      reference: params.reference,
      callback_url: params.callback_url,
      currency: "ZAR",
      metadata: params.metadata ?? {},
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? `Paystack error ${res.status}`);
  }

  return json.data;
}

// Verify a webhook event signature using HMAC-SHA512
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!PAYSTACK_SECRET_KEY || !signature) return false;
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}
