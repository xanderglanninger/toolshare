import crypto from "crypto";

export const PAYFAST_BASE_URL =
  process.env.PAYFAST_SANDBOX === "true"
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";

export const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID ?? "";
export const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY ?? "";
export const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || null;

export function isPayFastConfigured(): boolean {
  return Boolean(PAYFAST_MERCHANT_ID && PAYFAST_MERCHANT_KEY);
}

// Build MD5 signature from an ordered params object.
// PayFast requires params in their defined order (not alphabetical).
export function buildSignature(
  params: Record<string, string>,
  passphrase: string | null = null
): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, "+")}`);

  let str = parts.join("&");
  if (passphrase) {
    str += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }

  return crypto.createHash("md5").update(str).digest("hex");
}

// Verify an incoming ITN signature. Params must be in received order.
export function verifyITNSignature(
  params: Record<string, string>,
  passphrase: string | null = null
): boolean {
  const { signature, ...rest } = params;
  if (!signature) return false;
  const expected = buildSignature(rest, passphrase);
  return signature === expected;
}

// Verify the ITN with PayFast servers (recommended step).
export async function verifyWithPayFastServer(rawBody: string): Promise<boolean> {
  try {
    const verifyUrl =
      process.env.PAYFAST_SANDBOX === "true"
        ? "https://sandbox.payfast.co.za/eng/query/validate"
        : "https://www.payfast.co.za/eng/query/validate";

    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
    });
    const text = await res.text();
    return text.trim().toUpperCase() === "VALID";
  } catch {
    return false;
  }
}
