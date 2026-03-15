import {
  type User, type InsertUser,
  type Show, type InsertShow,
  type Ring, type InsertRing,
  type ShowClass, type InsertClass,
  type Activity, type InsertActivity,
  type Follow, type InsertFollow,
  type StaffAssignment, type InsertStaffAssignment,
  type PushSubscription, type InsertPushSubscription,
  type Subscription, type InsertSubscription,
  users, shows, staffAssignments, rings, classes, activities, follows, pushSubscriptions, subscriptions,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Shows
  getShows(): Promise<Show[]>;
  getShowsByOrganizer(organizerId: string): Promise<Show[]>;
  getShow(id: string): Promise<Show | undefined>;
  createShow(show: InsertShow): Promise<Show>;
  updateShow(id: string, updates: Partial<Show>): Promise<Show | undefined>;
  deleteShow(id: string): Promise<boolean>;

  // Staff assignments
  getStaffByShow(showId: string): Promise<StaffAssignment[]>;
  assignStaff(assignment: InsertStaffAssignment): Promise<StaffAssignment>;
  removeStaff(id: string): Promise<boolean>;
  isStaffForShow(userId: string, showId: string): Promise<boolean>;
  isStaffForRing(userId: string, ringId: string): Promise<boolean>;

  // Rings
  getRingsByShow(showId: string): Promise<Ring[]>;
  getRing(id: string): Promise<Ring | undefined>;
  createRing(ring: InsertRing): Promise<Ring>;
  updateRing(id: string, updates: Partial<Ring>): Promise<Ring | undefined>;
  deleteRing(id: string): Promise<boolean>;

  // Classes
  getClassesByRing(ringId: string): Promise<ShowClass[]>;
  createClass(cls: InsertClass): Promise<ShowClass>;
  updateClass(id: string, updates: Partial<ShowClass>): Promise<ShowClass | undefined>;
  deleteClass(id: string): Promise<boolean>;

  // Activities
  getActivities(ringId: string): Promise<Activity[]>;
  addActivity(activity: InsertActivity): Promise<Activity>;

  // Follows
  getFollow(userId: string, ringId: string): Promise<Follow | undefined>;
  getFollowsByUser(userId: string): Promise<Follow[]>;
  getFollowersByRing(ringId: string): Promise<Follow[]>;
  upsertFollow(follow: InsertFollow): Promise<Follow>;
  removeFollow(userId: string, ringId: string): Promise<boolean>;

  // Push subscriptions
  savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  removePushSubscription(id: string): Promise<boolean>;
  removePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;

  // Billing / subscriptions
  getSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByCustomerId(customerId: string): Promise<Subscription | undefined>;
  upsertSubscription(sub: InsertSubscription): Promise<Subscription>;
}

// ============ PostgreSQL Storage (Drizzle) ============

export class PgStorage implements IStorage {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // ---- Users ----
  async createUser(user: InsertUser): Promise<User> {
    const hashedPw = await bcrypt.hash(user.password, 10);
    const [created] = await this.db.insert(users).values({
      ...user,
      password: hashedPw,
    }).returning();
    return created;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  // ---- Shows ----
  async getShows(): Promise<Show[]> {
    return this.db.select().from(shows).where(eq(shows.isActive, true));
  }

  async getShowsByOrganizer(organizerId: string): Promise<Show[]> {
    return this.db.select().from(shows).where(eq(shows.organizerId, organizerId));
  }

  async getShow(id: string): Promise<Show | undefined> {
    const [show] = await this.db.select().from(shows).where(eq(shows.id, id)).limit(1);
    return show;
  }

  async createShow(show: InsertShow): Promise<Show> {
    const [created] = await this.db.insert(shows).values(show).returning();
    return created;
  }

  async updateShow(id: string, updates: Partial<Show>): Promise<Show | undefined> {
    const [updated] = await this.db.update(shows).set(updates).where(eq(shows.id, id)).returning();
    return updated;
  }

  async deleteShow(id: string): Promise<boolean> {
    const result = await this.db.delete(shows).where(eq(shows.id, id)).returning();
    return result.length > 0;
  }

  // ---- Staff ----
  async getStaffByShow(showId: string): Promise<StaffAssignment[]> {
    return this.db.select().from(staffAssignments).where(eq(staffAssignments.showId, showId));
  }

  async assignStaff(assignment: InsertStaffAssignment): Promise<StaffAssignment> {
    const [created] = await this.db.insert(staffAssignments).values(assignment).returning();
    return created;
  }

  async removeStaff(id: string): Promise<boolean> {
    const result = await this.db.delete(staffAssignments).where(eq(staffAssignments.id, id)).returning();
    return result.length > 0;
  }

  async isStaffForShow(userId: string, showId: string): Promise<boolean> {
    // Check if user is the organizer
    const [show] = await this.db.select().from(shows).where(eq(shows.id, showId)).limit(1);
    if (show && show.organizerId === userId) return true;
    // Check staff assignments
    const [assignment] = await this.db.select().from(staffAssignments)
      .where(and(eq(staffAssignments.userId, userId), eq(staffAssignments.showId, showId)))
      .limit(1);
    return !!assignment;
  }

  async isStaffForRing(userId: string, ringId: string): Promise<boolean> {
    const [ring] = await this.db.select().from(rings).where(eq(rings.id, ringId)).limit(1);
    if (!ring) return false;
    return this.isStaffForShow(userId, ring.showId);
  }

  // ---- Rings ----
  async getRingsByShow(showId: string): Promise<Ring[]> {
    return this.db.select().from(rings)
      .where(eq(rings.showId, showId))
      .orderBy(rings.sortOrder);
  }

  async getRing(id: string): Promise<Ring | undefined> {
    const [ring] = await this.db.select().from(rings).where(eq(rings.id, id)).limit(1);
    return ring;
  }

  async createRing(ring: InsertRing): Promise<Ring> {
    const [created] = await this.db.insert(rings).values(ring).returning();
    return created;
  }

  async updateRing(id: string, updates: Partial<Ring>): Promise<Ring | undefined> {
    const [updated] = await this.db.update(rings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rings.id, id))
      .returning();
    return updated;
  }

  async deleteRing(id: string): Promise<boolean> {
    const result = await this.db.delete(rings).where(eq(rings.id, id)).returning();
    return result.length > 0;
  }

  // ---- Classes ----
  async getClassesByRing(ringId: string): Promise<ShowClass[]> {
    return this.db.select().from(classes)
      .where(eq(classes.ringId, ringId))
      .orderBy(classes.sortOrder);
  }

  async createClass(cls: InsertClass): Promise<ShowClass> {
    const [created] = await this.db.insert(classes).values(cls).returning();
    return created;
  }

  async updateClass(id: string, updates: Partial<ShowClass>): Promise<ShowClass | undefined> {
    const [updated] = await this.db.update(classes).set(updates).where(eq(classes.id, id)).returning();
    return updated;
  }

  async deleteClass(id: string): Promise<boolean> {
    const result = await this.db.delete(classes).where(eq(classes.id, id)).returning();
    return result.length > 0;
  }

  // ---- Activities ----
  async getActivities(ringId: string): Promise<Activity[]> {
    return this.db.select().from(activities)
      .where(eq(activities.ringId, ringId))
      .orderBy(desc(activities.createdAt))
      .limit(20);
  }

  async addActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await this.db.insert(activities).values(activity).returning();
    return created;
  }

  // ---- Follows ----
  async getFollow(userId: string, ringId: string): Promise<Follow | undefined> {
    const [follow] = await this.db.select().from(follows)
      .where(and(eq(follows.userId, userId), eq(follows.ringId, ringId)))
      .limit(1);
    return follow;
  }

  async getFollowsByUser(userId: string): Promise<Follow[]> {
    return this.db.select().from(follows).where(eq(follows.userId, userId));
  }

  async upsertFollow(follow: InsertFollow): Promise<Follow> {
    const existing = await this.getFollow(follow.userId, follow.ringId);
    if (existing) {
      const [updated] = await this.db.update(follows)
        .set(follow)
        .where(eq(follows.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(follows).values(follow).returning();
    return created;
  }

  async removeFollow(userId: string, ringId: string): Promise<boolean> {
    const result = await this.db.delete(follows)
      .where(and(eq(follows.userId, userId), eq(follows.ringId, ringId)))
      .returning();
    return result.length > 0;
  }

  async getFollowersByRing(ringId: string): Promise<Follow[]> {
    return this.db.select().from(follows).where(eq(follows.ringId, ringId));
  }

  // ---- Push Subscriptions ----
  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    // Upsert by endpoint — one device = one subscription
    const [existing] = await this.db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub.endpoint)).limit(1);
    if (existing) {
      const [updated] = await this.db.update(pushSubscriptions)
        .set(sub)
        .where(eq(pushSubscriptions.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(pushSubscriptions).values(sub).returning();
    return created;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async removePushSubscription(id: string): Promise<boolean> {
    const result = await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id)).returning();
    return result.length > 0;
  }

  async removePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const result = await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).returning();
    return result.length > 0;
  }

  // ---- Billing ----
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await this.db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    return sub;
  }

  async getSubscriptionByCustomerId(customerId: string): Promise<Subscription | undefined> {
    const [sub] = await this.db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId)).limit(1);
    return sub;
  }

  async upsertSubscription(sub: InsertSubscription): Promise<Subscription> {
    const existing = await this.getSubscription(sub.userId);
    if (existing) {
      const [updated] = await this.db.update(subscriptions)
        .set(sub)
        .where(eq(subscriptions.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(subscriptions).values(sub).returning();
    return created;
  }
}

// ============ In-Memory Storage (development fallback) ============

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private shows: Map<string, Show> = new Map();
  private staffAssignments: Map<string, StaffAssignment> = new Map();
  private rings: Map<string, Ring> = new Map();
  private classes: Map<string, ShowClass> = new Map();
  private activities: Map<string, Activity> = new Map();
  private follows: Map<string, Follow> = new Map();
  private pushSubs: Map<string, PushSubscription> = new Map();
  private subs: Map<string, Subscription> = new Map();

  constructor() {
    this.seed();
  }

  private async seed() {
    const orgId = "demo-organizer";
    const hashedPw = await bcrypt.hash("demo123", 10);
    this.users.set(orgId, {
      id: orgId, email: "organizer@ringside.app", password: hashedPw,
      name: "Demo Organizer", role: "organizer", createdAt: new Date(),
    });
    const staffId = "demo-staff";
    const staffPw = await bcrypt.hash("staff123", 10);
    this.users.set(staffId, {
      id: staffId, email: "staff@ringside.app", password: staffPw,
      name: "Demo Staff", role: "staff", createdAt: new Date(),
    });
    const showData: Show[] = [
      { id: "devon", organizerId: orgId, name: "Devon Horse Show", location: "Devon, PA", startDate: "2026-05-20", endDate: "2026-05-31", isActive: true, createdAt: new Date() },
      { id: "wef3", organizerId: orgId, name: "WEF- Week 3", location: "Wellington, FL", startDate: "2026-02-01", endDate: "2026-02-08", isActive: true, createdAt: new Date() },
      { id: "upperville", organizerId: orgId, name: "Upperville Colt & Horse", location: "Upperville, VA", startDate: "2026-06-01", endDate: "2026-06-07", isActive: true, createdAt: new Date() },
      { id: "local-jumper", organizerId: orgId, name: "Local Jumper Classic", location: "Princeton, NJ", startDate: "2026-04-15", endDate: "2026-04-17", isActive: true, createdAt: new Date() },
    ];
    showData.forEach(s => this.shows.set(s.id, s));
    this.staffAssignments.set("sa1", { id: "sa1", showId: "devon", userId: staffId, ringId: null, role: "ring_operator" });
    const now = new Date();
    const ringData: Ring[] = [
      { id: "devon-ring1", showId: "devon", name: "Ring 1", discipline: "Hunters", status: "showing", holdReason: null, currentClassName: "Children's Hunters", currentClassNumber: 3, totalClasses: 5, tripsCompleted: 8, totalTrips: 14, nextClassName: "Children's Hunter U/S", sortOrder: 1, updatedAt: now },
      { id: "devon-ring2", showId: "devon", name: "Ring 2", discipline: "Jumpers", status: "schooling", holdReason: null, currentClassName: "1.20m Jumpers", currentClassNumber: 1, totalClasses: 3, tripsCompleted: 2, totalTrips: 18, nextClassName: "1.30m Jumpers", sortOrder: 2, updatedAt: now },
      { id: "devon-ring3", showId: "devon", name: "Ring 3", discipline: "Eq", status: "hold", holdReason: "Course Change", currentClassName: "Children's Equitation", currentClassNumber: 2, totalClasses: 4, tripsCompleted: 0, totalTrips: 12, nextClassName: "Adult Equitation", sortOrder: 3, updatedAt: now },
    ];
    ringData.forEach(r => this.rings.set(r.id, r));
    const classData: ShowClass[] = [
      { id: "c1", ringId: "devon-ring1", name: "Small Hunters", sortOrder: 1, totalTrips: 12 },
      { id: "c2", ringId: "devon-ring1", name: "Large Hunters", sortOrder: 2, totalTrips: 10 },
      { id: "c3", ringId: "devon-ring1", name: "Children's Hunters", sortOrder: 3, totalTrips: 14 },
      { id: "c4", ringId: "devon-ring1", name: "Children's Hunter U/S", sortOrder: 4, totalTrips: 14 },
      { id: "c5", ringId: "devon-ring1", name: "Adult Hunters", sortOrder: 5, totalTrips: 16 },
    ];
    classData.forEach(c => this.classes.set(c.id, c));
    const actData: Activity[] = [
      { id: "a1", ringId: "devon-ring1", message: "Showing resumed", time: "9:42", createdAt: new Date() },
      { id: "a2", ringId: "devon-ring1", message: "Drag Break", time: "9:35", createdAt: new Date() },
      { id: "a3", ringId: "devon-ring2", message: "Schooling started", time: "9:30", createdAt: new Date() },
      { id: "a4", ringId: "devon-ring3", message: "Hold: Course Change", time: "9:20", createdAt: new Date() },
    ];
    actData.forEach(a => this.activities.set(a.id, a));
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPw = await bcrypt.hash(user.password, 10);
    const newUser: User = { ...user, id, password: hashedPw, createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }
  async getUserById(id: string) { return this.users.get(id); }
  async getUserByEmail(email: string) {
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  async getShows() { return Array.from(this.shows.values()).filter(s => s.isActive); }
  async getShowsByOrganizer(organizerId: string) {
    return Array.from(this.shows.values()).filter(s => s.organizerId === organizerId);
  }
  async getShow(id: string) { return this.shows.get(id); }
  async createShow(show: InsertShow): Promise<Show> {
    const id = randomUUID();
    const newShow: Show = { ...show, id, isActive: true, createdAt: new Date() };
    this.shows.set(id, newShow);
    return newShow;
  }
  async updateShow(id: string, updates: Partial<Show>) {
    const show = this.shows.get(id);
    if (!show) return undefined;
    const updated = { ...show, ...updates };
    this.shows.set(id, updated);
    return updated;
  }
  async deleteShow(id: string) { return this.shows.delete(id); }
  async getStaffByShow(showId: string) {
    return Array.from(this.staffAssignments.values()).filter(s => s.showId === showId);
  }
  async assignStaff(assignment: InsertStaffAssignment): Promise<StaffAssignment> {
    const id = randomUUID();
    const sa: StaffAssignment = { ...assignment, id };
    this.staffAssignments.set(id, sa);
    return sa;
  }
  async removeStaff(id: string) { return this.staffAssignments.delete(id); }
  async isStaffForShow(userId: string, showId: string) {
    const show = this.shows.get(showId);
    if (show && show.organizerId === userId) return true;
    return Array.from(this.staffAssignments.values()).some(
      s => s.userId === userId && s.showId === showId
    );
  }
  async isStaffForRing(userId: string, ringId: string) {
    const ring = this.rings.get(ringId);
    if (!ring) return false;
    return this.isStaffForShow(userId, ring.showId);
  }
  async getRingsByShow(showId: string) {
    return Array.from(this.rings.values())
      .filter(r => r.showId === showId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }
  async getRing(id: string) { return this.rings.get(id); }
  async createRing(ring: InsertRing): Promise<Ring> {
    const id = randomUUID();
    const newRing: Ring = { ...ring, id, updatedAt: new Date() };
    this.rings.set(id, newRing);
    return newRing;
  }
  async updateRing(id: string, updates: Partial<Ring>) {
    const ring = this.rings.get(id);
    if (!ring) return undefined;
    const updated = { ...ring, ...updates, updatedAt: new Date() };
    this.rings.set(id, updated);
    return updated;
  }
  async deleteRing(id: string) { return this.rings.delete(id); }
  async getClassesByRing(ringId: string) {
    return Array.from(this.classes.values())
      .filter(c => c.ringId === ringId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }
  async createClass(cls: InsertClass): Promise<ShowClass> {
    const id = randomUUID();
    const newClass: ShowClass = { ...cls, id };
    this.classes.set(id, newClass);
    return newClass;
  }
  async updateClass(id: string, updates: Partial<ShowClass>) {
    const cls = this.classes.get(id);
    if (!cls) return undefined;
    const updated = { ...cls, ...updates };
    this.classes.set(id, updated);
    return updated;
  }
  async deleteClass(id: string) { return this.classes.delete(id); }
  async getActivities(ringId: string) {
    return Array.from(this.activities.values())
      .filter(a => a.ringId === ringId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 20);
  }
  async addActivity(activity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const a: Activity = { ...activity, id, createdAt: new Date() };
    this.activities.set(id, a);
    return a;
  }
  async getFollow(userId: string, ringId: string) {
    return Array.from(this.follows.values()).find(
      f => f.userId === userId && f.ringId === ringId
    );
  }
  async getFollowsByUser(userId: string) {
    return Array.from(this.follows.values()).filter(f => f.userId === userId);
  }
  async upsertFollow(follow: InsertFollow): Promise<Follow> {
    const existing = await this.getFollow(follow.userId, follow.ringId);
    if (existing) {
      const updated = { ...existing, ...follow };
      this.follows.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const f: Follow = { ...follow, id };
    this.follows.set(id, f);
    return f;
  }
  async removeFollow(userId: string, ringId: string) {
    const f = await this.getFollow(userId, ringId);
    if (f) return this.follows.delete(f.id);
    return false;
  }
  async getFollowersByRing(ringId: string) {
    return Array.from(this.follows.values()).filter(f => f.ringId === ringId);
  }

  // ---- Push Subscriptions (in-memory) ----
  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    // Check for existing by endpoint
    const existing = Array.from(this.pushSubs.values()).find(s => s.endpoint === sub.endpoint);
    if (existing) {
      const updated: PushSubscription = { ...existing, ...sub };
      this.pushSubs.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const ps: PushSubscription = { ...sub, id, createdAt: new Date() };
    this.pushSubs.set(id, ps);
    return ps;
  }
  async getPushSubscriptionsByUser(userId: string) {
    return Array.from(this.pushSubs.values()).filter(s => s.userId === userId);
  }
  async removePushSubscription(id: string) {
    return this.pushSubs.delete(id);
  }
  async removePushSubscriptionByEndpoint(endpoint: string) {
    const sub = Array.from(this.pushSubs.values()).find(s => s.endpoint === endpoint);
    if (sub) return this.pushSubs.delete(sub.id);
    return false;
  }

  // ---- Billing (in-memory) ----
  async getSubscription(userId: string) {
    return Array.from(this.subs.values()).find(s => s.userId === userId);
  }
  async getSubscriptionByCustomerId(customerId: string) {
    return Array.from(this.subs.values()).find(s => s.stripeCustomerId === customerId);
  }
  async upsertSubscription(sub: InsertSubscription): Promise<Subscription> {
    const existing = await this.getSubscription(sub.userId);
    if (existing) {
      const updated: Subscription = { ...existing, ...sub };
      this.subs.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const s: Subscription = { ...sub, id, createdAt: new Date() };
    this.subs.set(id, s);
    return s;
  }
}

// ============ Storage Factory ============

let _storage: IStorage | null = null;

export async function initStorage(): Promise<IStorage> {
  if (_storage) return _storage;

  if (process.env.DATABASE_URL) {
    const { db } = await import("./db");
    console.log("Using PostgreSQL storage");
    _storage = new PgStorage(db);
  } else {
    console.log("No DATABASE_URL found — using in-memory storage (data will not persist across restarts)");
    _storage = new MemStorage();
  }
  return _storage;
}

// Lazy proxy that initializes on first access
const handler: ProxyHandler<IStorage> = {
  get(_target, prop) {
    if (!_storage) {
      // Fallback: if initStorage hasn't been called, use MemStorage
      if (process.env.DATABASE_URL) {
        // This shouldn't happen in normal flow, but provide a sync fallback
        throw new Error("Storage not initialized. Call initStorage() before using storage.");
      }
      _storage = new MemStorage();
    }
    return (_storage as any)[prop];
  },
};

export const storage: IStorage = new Proxy({} as IStorage, handler);
