import type { Currency } from '../constants.ts';

/**
 * 'razorpay' is the spec. 'free' (testing) confirms the order at ₹0 without Razorpay. 'link'
 * (first build) confirms it at the package price and sends the customer to a razorpay.me page,
 * flagged for an admin to verify. The server's PAYMENTS_MODE decides; clients only use it
 * for labels.
 */
export type PaymentsMode = 'razorpay' | 'free' | 'link';

export function parsePaymentsMode(value: string | undefined): PaymentsMode {
  return value === 'free' || value === 'link' ? value : 'razorpay';
}

/** POST /api/orders/:id/checkout (LLD §9.4 step 6). */
export type CheckoutResponse =
  | {
      confirmed: false;
      checkoutUrl: string;
      razorpayOrderId: string;
      amountMinor: number;
      currency: Currency;
    }
  /**
   * PAYMENTS_MODE=free: confirmed at ₹0, show the success screen.
   * PAYMENTS_MODE=link: confirmed; send the customer to paymentUrl to pay amountMinor.
   */
  | { confirmed: true; amountMinor: number; currency: Currency; paymentUrl?: string };

/** Where the hosted /pay page sends the customer back to (LLD §9.5). */
export type CheckoutReturn = 'web' | 'app';

export type PaymentResultStatus = 'success' | 'failed' | 'pending';

/** GET /api/orders/:id (LLD §8.1). */
export interface OrderDetailResponse {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    headline: string;
    body: string;
    instagramHandle: string | null;
    packageId: string;
    packageName: string | null;
    amountMinor: number | null;
    currency: Currency | null;
    paidAt: string | null;
    deadlineAt: string | null;
    publishedAt: string | null;
    changesRequestedReason: string | null;
    rejectionReason: string | null;
    reportStatus: string;
    createdAt: string;
  };
  /** Only once published (RLS): one row per live link. */
  placements: {
    id: string;
    channel: string;
    platform: string;
    liveUrl: string;
    postedAt: string | null;
  }[];
  /** 5-minute signed URL of the latest PDF when the report is ready. */
  reportUrl: string | null;
  /** Refunds on this order (status only). */
  refunds: { id: string; amountMinor: number; status: string; createdAt: string }[];
}
