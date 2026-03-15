import type { Express } from "express";
import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { signToken, requireAuth, optionalAuth, requireRole } from "./auth";
import { loginSchema, registerSchema, insertShowSchema, insertRingSchema, insertClassSchema, insertStaffAssignmentSchema } from "@shared/schema";
import { z } from "zod";
import { getVapidPublicKey, isPushEnabled, sendPushToMany, type PushPayload } from "./notifications";
import { isBillingEnabled, createCheckoutSession, createCustomer, createPortalSession, constructWebhookEvent, PLAN_LIMITS, type PlanId } from "./billing";

// ============ WebSocket Broadcast ============

let wss: WebSocketServer;

function broadcast(showId: string, type: string, data: unknown) {
  if (!wss) return;
  const msg = JSON.stringify({ showId, type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ WebSocket Setup ============
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected", message: "Ringside WebSocket connected" }));
    ws.on("error", () => {});
  });

  // ============ AUTH ROUTES ============

  app.post("/api/auth/register", async (req, res) => {
    try {
      const body = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(body.email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const user = await storage.createUser({
        email: body.email,
        password: body.password,
        name: body.name,
        role: body.role,
      });
      const token = signToken(user);
      return res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      throw err;
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(body.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(body.password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = signToken(user);
      return res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      throw err;
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  // ============ PUBLIC SHOW ROUTES (viewers) ============

  app.get("/api/shows", async (_req, res) => {
    const shows = await storage.getShows();
    res.json(shows);
  });

  app.get("/api/shows/:id", async (req, res) => {
    const show = await storage.getShow(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });
    res.json(show);
  });

  // ============ ORGANIZER SHOW MANAGEMENT ============

  app.get("/api/organizer/shows", requireAuth, requireRole("organizer"), async (req, res) => {
    const shows = await storage.getShowsByOrganizer(req.user!.userId);
    res.json(shows);
  });

  app.post("/api/organizer/shows", requireAuth, requireRole("organizer"), async (req, res) => {
    try {
      const body = insertShowSchema.parse({ ...req.body, organizerId: req.user!.userId });
      const show = await storage.createShow(body);
      res.status(201).json(show);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      throw err;
    }
  });

  app.patch("/api/organizer/shows/:id", requireAuth, requireRole("organizer"), async (req, res) => {
    const show = await storage.getShow(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });
    if (show.organizerId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your show" });
    }
    const updated = await storage.updateShow(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/organizer/shows/:id", requireAuth, requireRole("organizer"), async (req, res) => {
    const show = await storage.getShow(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });
    if (show.organizerId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your show" });
    }
    await storage.deleteShow(req.params.id);
    res.json({ success: true });
  });

  // ============ STAFF ASSIGNMENTS (organizer only) ============

  app.get("/api/organizer/shows/:showId/staff", requireAuth, requireRole("organizer"), async (req, res) => {
    const show = await storage.getShow(req.params.showId);
    if (!show || show.organizerId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your show" });
    }
    const staff = await storage.getStaffByShow(req.params.showId);
    res.json(staff);
  });

  app.post("/api/organizer/shows/:showId/staff", requireAuth, requireRole("organizer"), async (req, res) => {
    const show = await storage.getShow(req.params.showId);
    if (!show || show.organizerId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your show" });
    }
    try {
      const body = insertStaffAssignmentSchema.parse({ ...req.body, showId: req.params.showId });
      const assignment = await storage.assignStaff(body);
      res.status(201).json(assignment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      throw err;
    }
  });

  app.delete("/api/organizer/staff/:id", requireAuth, requireRole("organizer"), async (req, res) => {
    await storage.removeStaff(req.params.id);
    res.json({ success: true });
  });

  // ============ RING ROUTES ============

  app.get("/api/shows/:showId/rings", async (req, res) => {
    const rings = await storage.getRingsByShow(req.params.showId);
    res.json(rings);
  });

  app.get("/api/rings/:id", async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });
    res.json(ring);
  });

  // Create ring (organizer for their show)
  app.post("/api/organizer/shows/:showId/rings", requireAuth, requireRole("organizer"), async (req, res) => {
    const show = await storage.getShow(req.params.showId);
    if (!show || show.organizerId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your show" });
    }
    try {
      const body = insertRingSchema.parse({ ...req.body, showId: req.params.showId });
      const ring = await storage.createRing(body);
      broadcast(req.params.showId, "ring:created", ring);
      res.status(201).json(ring);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      throw err;
    }
  });

  // Update ring (staff or organizer)
  app.patch("/api/rings/:id", requireAuth, async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });

    const isStaff = await storage.isStaffForRing(req.user!.userId, req.params.id);
    const show = await storage.getShow(ring.showId);
    const isOrganizer = show?.organizerId === req.user!.userId;

    if (!isStaff && !isOrganizer) {
      return res.status(403).json({ error: "Not authorized for this ring" });
    }

    const oldStatus = ring.status;
    const updated = await storage.updateRing(req.params.id, req.body);
    broadcast(ring.showId, "ring:updated", updated);

    // Send push notifications if status changed
    if (req.body.status && req.body.status !== oldStatus && show) {
      notifyRingFollowers(ring.id, ring.name, show.name, {
        type: "status_change",
        oldStatus,
        newStatus: req.body.status,
      }).catch(console.error);
    }

    res.json(updated);
  });

  // Delete ring (organizer only)
  app.delete("/api/organizer/rings/:id", requireAuth, requireRole("organizer"), async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });
    const show = await storage.getShow(ring.showId);
    if (!show || show.organizerId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your show" });
    }
    await storage.deleteRing(req.params.id);
    broadcast(ring.showId, "ring:deleted", { id: req.params.id });
    res.json({ success: true });
  });

  // ============ CLASS ROUTES ============

  app.get("/api/rings/:ringId/classes", async (req, res) => {
    const classes = await storage.getClassesByRing(req.params.ringId);
    res.json(classes);
  });

  app.post("/api/organizer/rings/:ringId/classes", requireAuth, requireRole("organizer"), async (req, res) => {
    const ring = await storage.getRing(req.params.ringId);
    if (!ring) return res.status(404).json({ error: "Ring not found" });
    const show = await storage.getShow(ring.showId);
    if (!show || show.organizerId !== req.user!.userId) {
      return res.status(403).json({ error: "Not your show" });
    }
    try {
      const body = insertClassSchema.parse({ ...req.body, ringId: req.params.ringId });
      const cls = await storage.createClass(body);
      res.status(201).json(cls);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      throw err;
    }
  });

  // ============ ACTIVITY ROUTES ============

  app.get("/api/rings/:ringId/activities", async (req, res) => {
    const activities = await storage.getActivities(req.params.ringId);
    res.json(activities);
  });

  app.post("/api/rings/:ringId/activities", requireAuth, async (req, res) => {
    const ring = await storage.getRing(req.params.ringId);
    if (!ring) return res.status(404).json({ error: "Ring not found" });

    const isStaff = await storage.isStaffForRing(req.user!.userId, req.params.ringId);
    const show = await storage.getShow(ring.showId);
    const isOrganizer = show?.organizerId === req.user!.userId;

    if (!isStaff && !isOrganizer) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { message, time } = req.body;
    const activity = await storage.addActivity({ ringId: req.params.ringId, message, time });
    broadcast(ring.showId, "activity:created", activity);
    res.json(activity);
  });

  // ============ TRIP / CLASS NAVIGATION (staff controls) ============

  app.post("/api/rings/:id/trip", requireAuth, async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });

    const isStaff = await storage.isStaffForRing(req.user!.userId, req.params.id);
    const show = await storage.getShow(ring.showId);
    const isOrganizer = show?.organizerId === req.user!.userId;
    if (!isStaff && !isOrganizer) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const direction = req.body.direction || "increment";
    const newTrips = direction === "increment"
      ? Math.min((ring.tripsCompleted || 0) + 1, ring.totalTrips || 99)
      : Math.max((ring.tripsCompleted || 0) - 1, 0);
    const updated = await storage.updateRing(req.params.id, { tripsCompleted: newTrips });
    broadcast(ring.showId, "ring:updated", updated);
    res.json(updated);
  });

  app.post("/api/rings/:id/navigate-class", requireAuth, async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });

    const isStaff = await storage.isStaffForRing(req.user!.userId, req.params.id);
    const show = await storage.getShow(ring.showId);
    const isOrganizer = show?.organizerId === req.user!.userId;
    if (!isStaff && !isOrganizer) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const direction = req.body.direction;
    const current = ring.currentClassNumber || 1;
    const total = ring.totalClasses || 5;
    let newClass = current;
    if (direction === "next" && current < total) newClass = current + 1;
    if (direction === "previous" && current > 1) newClass = current - 1;
    const updated = await storage.updateRing(req.params.id, {
      currentClassNumber: newClass,
      tripsCompleted: 0,
    });
    broadcast(ring.showId, "ring:updated", updated);

    // Notify followers of class change
    if (newClass !== current && show) {
      notifyRingFollowers(ring.id, ring.name, show.name, {
        type: "class_change",
        className: updated?.currentClassName || undefined,
      }).catch(console.error);
    }

    res.json(updated);
  });

  // ============ FOLLOWS / ALERTS (viewer, requires auth) ============

  app.get("/api/follows", requireAuth, async (req, res) => {
    const follows = await storage.getFollowsByUser(req.user!.userId);
    res.json(follows);
  });

  app.get("/api/follows/:ringId", requireAuth, async (req, res) => {
    const follow = await storage.getFollow(req.user!.userId, req.params.ringId);
    res.json(follow || null);
  });

  app.put("/api/follows/:ringId", requireAuth, async (req, res) => {
    const follow = await storage.upsertFollow({
      userId: req.user!.userId,
      ringId: req.params.ringId,
      ...req.body,
    });
    res.json(follow);
  });

  app.delete("/api/follows/:ringId", requireAuth, async (req, res) => {
    await storage.removeFollow(req.user!.userId, req.params.ringId);
    res.json({ success: true });
  });

  // ============ PUSH NOTIFICATIONS ============

  // Get VAPID public key (client needs this to subscribe)
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ key: getVapidPublicKey(), enabled: isPushEnabled() });
  });

  // Save push subscription
  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Invalid push subscription" });
    }
    const sub = await storage.savePushSubscription({
      userId: req.user!.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    res.json(sub);
  });

  // Unsubscribe
  app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) {
      await storage.removePushSubscriptionByEndpoint(endpoint);
    }
    res.json({ success: true });
  });

  // ============ BILLING / STRIPE ============

  // Get current subscription for logged-in organizer
  app.get("/api/billing/subscription", requireAuth, requireRole("organizer"), async (req, res) => {
    const sub = await storage.getSubscription(req.user!.userId);
    const plan = (sub?.plan || "free") as PlanId;
    res.json({
      plan,
      status: sub?.status || "active",
      limits: PLAN_LIMITS[plan] || PLAN_LIMITS.free,
      billingEnabled: isBillingEnabled(),
      currentPeriodEnd: sub?.currentPeriodEnd,
    });
  });

  // Create Stripe checkout session for upgrade
  app.post("/api/billing/checkout", requireAuth, requireRole("organizer"), async (req, res) => {
    if (!isBillingEnabled()) {
      return res.status(503).json({ error: "Billing not configured" });
    }

    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: "priceId required" });

    // Ensure organizer has a Stripe customer
    let sub = await storage.getSubscription(req.user!.userId);
    let customerId: string;

    if (sub?.stripeCustomerId) {
      customerId = sub.stripeCustomerId;
    } else {
      const user = await storage.getUserById(req.user!.userId);
      customerId = await createCustomer(user!.email, user!.name);
      await storage.upsertSubscription({
        userId: req.user!.userId,
        stripeCustomerId: customerId,
        plan: "free",
        status: "active",
      });
    }

    const origin = `${req.protocol}://${req.get("host")}`;
    const url = await createCheckoutSession({
      customerId,
      priceId,
      userId: req.user!.userId,
      successUrl: `${origin}/#/dashboard?billing=success`,
      cancelUrl: `${origin}/#/dashboard?billing=canceled`,
    });

    res.json({ url });
  });

  // Create Stripe customer portal session
  app.post("/api/billing/portal", requireAuth, requireRole("organizer"), async (req, res) => {
    if (!isBillingEnabled()) {
      return res.status(503).json({ error: "Billing not configured" });
    }

    const sub = await storage.getSubscription(req.user!.userId);
    if (!sub?.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const origin = `${req.protocol}://${req.get("host")}`;
    const url = await createPortalSession(sub.stripeCustomerId, `${origin}/#/dashboard`);
    res.json({ url });
  });

  // Stripe webhook handler
  app.post("/api/billing/webhook", async (req, res) => {
    if (!isBillingEnabled()) return res.sendStatus(200);

    const sig = req.headers["stripe-signature"];
    if (!sig) return res.sendStatus(400);

    try {
      const event = constructWebhookEvent(
        req.rawBody as Buffer,
        sig as string
      );

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;
          if (userId && session.subscription) {
            await storage.upsertSubscription({
              userId,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              plan: "basic", // default upgrade plan
              status: "active",
            });
          }
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          const sub = await storage.getSubscriptionByCustomerId(subscription.customer);
          if (sub) {
            await storage.upsertSubscription({
              ...sub,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          const sub = await storage.getSubscriptionByCustomerId(subscription.customer);
          if (sub) {
            await storage.upsertSubscription({
              ...sub,
              plan: "free",
              status: "canceled",
              stripeSubscriptionId: null,
            });
          }
          break;
        }
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  return httpServer;
}

// ============ NOTIFICATION HELPERS ============

/**
 * Send push notifications to all followers of a ring when its status changes.
 * Called after ring updates that viewers care about.
 */
async function notifyRingFollowers(ringId: string, ringName: string, showName: string, change: {
  type: "status_change" | "class_change" | "trip_update";
  oldStatus?: string;
  newStatus?: string;
  className?: string;
}) {
  if (!isPushEnabled()) return;

  const followers = await storage.getFollowersByRing(ringId);
  if (followers.length === 0) return;

  let payload: PushPayload;
  const tag = `ring-${ringId}`;

  switch (change.type) {
    case "status_change":
      if (change.newStatus === "hold") {
        payload = {
          title: `${ringName} — Hold`,
          body: `${ringName} at ${showName} is now on hold.`,
          tag,
          url: `/ring/${ringId}`,
        };
      } else if (change.newStatus === "schooling") {
        payload = {
          title: `${ringName} — Schooling`,
          body: `${ringName} at ${showName} has started schooling.`,
          tag,
          url: `/ring/${ringId}`,
        };
      } else {
        payload = {
          title: `${ringName} — Showing`,
          body: `${ringName} at ${showName} has resumed showing.`,
          tag,
          url: `/ring/${ringId}`,
        };
      }
      break;
    case "class_change":
      payload = {
        title: `${ringName} — New Class`,
        body: `Now showing: ${change.className || "next class"} at ${showName}.`,
        tag,
        url: `/ring/${ringId}`,
      };
      break;
    default:
      return; // Don't notify on every trip increment
  }

  // Gather all push subs for all followers
  const allSubs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = [];
  for (const follow of followers) {
    // Check alert preferences
    if (change.type === "status_change") {
      if (change.newStatus === "schooling" && !follow.alertSchoolingStarts) continue;
      if (change.newStatus === "showing" && !follow.alertRingResumes) continue;
    }
    if (change.type === "class_change" && !follow.alertClassNearby) continue;

    const subs = await storage.getPushSubscriptionsByUser(follow.userId);
    allSubs.push(...subs);
  }

  if (allSubs.length === 0) return;

  const expiredIds = await sendPushToMany(allSubs, payload);
  // Clean up expired subscriptions
  for (const id of expiredIds) {
    await storage.removePushSubscription(id);
  }
}
