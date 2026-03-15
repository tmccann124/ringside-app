/**
 * Push notification service for Ringside.
 * Uses the Web Push protocol (works on iOS Safari 16.4+, Chrome, Firefox, Edge).
 * 
 * Environment variables:
 *   VAPID_PUBLIC_KEY  — generated once with `npx web-push generate-vapid-keys`
 *   VAPID_PRIVATE_KEY — keep secret
 *   VAPID_EMAIL       — contact email for push service (e.g. mailto:tom@mccannmd.com)
 */
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:support@ringside.app";

let pushEnabled = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  pushEnabled = true;
  console.log("Push notifications enabled");
} else {
  console.log("Push notifications disabled — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable");
}

export function isPushEnabled() {
  return pushEnabled;
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string; // groups notifications so only latest shows
}

/**
 * Send a push notification to a single subscription.
 * Returns true if sent, false if the subscription is expired/invalid.
 */
export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  if (!pushEnabled) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 } // 1 hour TTL
    );
    return true;
  } catch (err: any) {
    // 410 Gone or 404 means subscription is no longer valid
    if (err.statusCode === 410 || err.statusCode === 404) {
      return false; // caller should remove this subscription
    }
    console.error("Push notification failed:", err.message);
    return false;
  }
}

/**
 * Send push notifications to multiple subscriptions.
 * Returns array of subscription IDs that are no longer valid (should be removed).
 */
export async function sendPushToMany(
  subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload
): Promise<string[]> {
  const expiredIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const sent = await sendPush(sub, payload);
      if (!sent && pushEnabled) {
        expiredIds.push(sub.id);
      }
    })
  );

  return expiredIds;
}
