import { PAYSTACK_BASE_URL, paystackHeaders } from "./paystack";

interface TransferParams {
  listerId: string;
  payoutId: string;       // DailyPayout.id — used as idempotency key
  amount: number;         // ZAR amount to transfer
  recipientCode: string;  // Paystack transfer recipient code
  reference: string;      // appears on bank statement
}

interface TransferResult {
  success: boolean;
  reference?: string;
  error?: string;
}

// Create a transfer recipient for a lender's bank account.
// Call once when the lender registers their bank account; store the returned
// recipientCode on the User record.
export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;       // Paystack bank code (3-digit, e.g. "007" for First National Bank)
}): Promise<{ recipientCode: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      type: "nuban",
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: "ZAR",
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? `Paystack recipient creation failed: ${res.status}`);
  }

  return { recipientCode: json.data.recipient_code };
}

// Initiate a single transfer to a lender.
export async function sendTransfer(params: TransferParams): Promise<TransferResult> {
  try {
    const res = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
      method: "POST",
      headers: paystackHeaders(),
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(params.amount * 100), // kobo
        recipient: params.recipientCode,
        reason: params.reference,
        reference: params.payoutId, // idempotency key
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.status) {
      console.error(`[paystack-transfers] Transfer failed for payout ${params.payoutId}:`, json.message);
      return { success: false, error: json.message ?? `HTTP ${res.status}` };
    }

    return { success: true, reference: json.data?.transfer_code ?? params.payoutId };
  } catch (err: any) {
    console.error(`[paystack-transfers] Unexpected error for payout ${params.payoutId}:`, err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}
