/**
 * Stripe billing integration for Ringside.
 * 
 * Pricing tiers:
 *   Free  — 1 show, 3 rings max
 *   Basic ($29/mo) — 5 shows, unlimited rings
 *   Pro   ($79/mo) — unlimited shows, priority support, analytics
 * 
 * Environment variables:
 *   STRIPE_SECRET_KEY     — from Stripe dashboard
 *   STRIPE_WEBHOOK_SECRET — from Stripe webhook endpoint config
 *   VITE_STRIPE_PUBLIC_KEY — publishable key (passed to frontend)
 */
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

let stripe: Stripe | null = null;
let billingEnabled = false;

if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
  billingEnabled = true;
  console.log("Stripe billing enabled");
} else {
  console.log("Stripe billing disabled — set STRIPE_SECRET_KEY to enable");
}

export function isBillingEnabled() {
  return billingEnabled;
}

export function getStripe() {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe;
}

export function getWebhookSecret() {
  return STRIPE_WEBHOOK_SECRET;
}

// Plan limits
export const PLAN_LIMITS = {
  free: { maxShows: 1, maxRingsPerShow: 3 },
  basic: { maxShows: 5, maxRingsPerShow: 999 },
  pro: { maxShows: 999, maxRingsPerShow: 999 },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

/**
 * Create a Stripe checkout session for a plan upgrade.
 */
export async function createCheckoutSession(opts: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const s = getStripe();
  const session = await s.checkout.sessions.create({
    customer: opts.customerId,
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { userId: opts.userId },
  });
  return session.url || "";
}

/**
 * Create a Stripe customer for a new organizer.
 */
export async function createCustomer(email: string, name: string): Promise<string> {
  const s = getStripe();
  const customer = await s.customers.create({ email, name, metadata: { app: "ringside" } });
  return customer.id;
}

/**
 * Create a billing portal session so organizers can manage their subscription.
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const s = getStripe();
  const session = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/**
 * Parse and verify a Stripe webhook event.
 */
export function constructWebhookEvent(payload: Buffer, sig: string): Stripe.Event {
  const s = getStripe();
  return s.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);
}
