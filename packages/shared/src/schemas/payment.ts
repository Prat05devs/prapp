import type { Currency } from '../constants.ts';

/**
 * 'razorpay' is the spec. 'free' is the testing phase: checkout confirms the order at ₹0
 * without Razorpay. The server's PAYMENTS_MODE decides; clients only use it for labels.
 */
export type PaymentsMode = 'razorpay' | 'free';

export function parsePaymentsMode(value: string | undefined): PaymentsMode {
  return value === 'free' ? 'free' : 'razorpay';
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
  /** PAYMENTS_MODE=free: the order is already paid at ₹0; show the success screen. */
  | { confirmed: true; amountMinor: 0; currency: Currency };

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
