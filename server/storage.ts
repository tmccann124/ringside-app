import {
  type User, type InsertUser,
  type Show, type InsertShow,
  type Ring, type InsertRing,
  type ShowClass, type InsertClass,
  type Activity, type InsertActivity,
  type Follow, type InsertFollow,
  type StaffAssignment, type InsertStaffAssignment,
} from "@shared/schema";
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
  upsertFollow(follow: InsertFollow): Promise<Follow>;
  removeFollow(userId: string, ringId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private shows: Map<string, Show> = new Map();
  private staffAssignments: Map<string, StaffAssignment> = new Map();
  private rings: Map<string, Ring> = new Map();
  private classes: Map<string, ShowClass> = new Map();
  private activities: Map<string, Activity> = new Map();
  private follows: Map<string, Follow> = new Map();

  constructor() {
    this.seed();
  }

  private async seed() {
    // Create a demo organizer
    const orgId = "demo-organizer";
    const hashedPw = await bcrypt.hash("demo123", 10);
    this.users.set(orgId, {
      id: orgId,
      email: "organizer@ringside.app",
      password: hashedPw,
      name: "Demo Organizer",
      role: "organizer",
      createdAt: new Date(),
    });

    // Create a demo staff
    const staffId = "demo-staff";
    const staffPw = await bcrypt.hash("staff123", 10);
    this.users.set(staffId, {
      id: staffId,
      email: "staff@ringside.app",
      password: staffPw,
      name: "Demo Staff",
      role: "staff",
      createdAt: new Date(),
    });

    // Seed shows
    const showData: Show[] = [
      { id: "devon", organizerId: orgId, name: "Devon Horse Show", location: "Devon, PA", startDate: "2026-05-20", endDate: "2026-05-31", isActive: true, createdAt: new Date() },
      { id: "wef3", organizerId: orgId, name: "WEF- Week 3", location: "Wellington, FL", startDate: "2026-02-01", endDate: "2026-02-08", isActive: true, createdAt: new Date() },
      { id: "upperville", organizerId: orgId, name: "Upperville Colt & Horse", location: "Upperville, VA", startDate: "2026-06-01", endDate: "2026-06-07", isActive: true, createdAt: new Date() },
      { id: "local-jumper", organizerId: orgId, name: "Local Jumper Classic", location: "Princeton, NJ", startDate: "2026-04-15", endDate: "2026-04-17", isActive: true, createdAt: new Date() },
    ];
    showData.forEach(s => this.shows.set(s.id, s));

    // Assign demo staff to Devon
    this.staffAssignments.set("sa1", { id: "sa1", showId: "devon", userId: staffId, ringId: null, role: "ring_operator" });

    // Seed rings
    const now = new Date();
    const ringData: Ring[] = [
      { id: "devon-ring1", showId: "devon", name: "Ring 1", discipline: "Hunters", status: "showing", holdReason: null, currentClassName: "Children's Hunters", currentClassNumber: 3, totalClasses: 5, tripsCompleted: 8, totalTrips: 14, nextClassName: "Children's Hunter U/S", sortOrder: 1, updatedAt: now },
      { id: "devon-ring2", showId: "devon", name: "Ring 2", discipline: "Jumpers", status: "schooling", holdReason: null, currentClassName: "1.20m Jumpers", currentClassNumber: 1, totalClasses: 3, tripsCompleted: 2, totalTrips: 18, nextClassName: "1.30m Jumpers", sortOrder: 2, updatedAt: now },
      { id: "devon-ring3", showId: "devon", name: "Ring 3", discipline: "Eq", status: "hold", holdReason: "Course Change", currentClassName: "Children's Equitation", currentClassNumber: 2, totalClasses: 4, tripsCompleted: 0, totalTrips: 12, nextClassName: "Adult Equitation", sortOrder: 3, updatedAt: now },
    ];
    ringData.forEach(r => this.rings.set(r.id, r));

    // Seed classes for Ring 1
    const classData: ShowClass[] = [
      { id: "c1", ringId: "devon-ring1", name: "Small Hunters", sortOrder: 1, totalTrips: 12 },
      { id: "c2", ringId: "devon-ring1", name: "Large Hunters", sortOrder: 2, totalTrips: 10 },
      { id: "c3", ringId: "devon-ring1", name: "Children's Hunters", sortOrder: 3, totalTrips: 14 },
      { id: "c4", ringId: "devon-ring1", name: "Children's Hunter U/S", sortOrder: 4, totalTrips: 14 },
      { id: "c5", ringId: "devon-ring1", name: "Adult Hunters", sortOrder: 5, totalTrips: 16 },
    ];
    classData.forEach(c => this.classes.set(c.id, c));

    // Seed activities
    const actData: Activity[] = [
      { id: "a1", ringId: "devon-ring1", message: "Showing resumed", time: "9:42", createdAt: new Date() },
      { id: "a2", ringId: "devon-ring1", message: "Drag Break", time: "9:35", createdAt: new Date() },
      { id: "a3", ringId: "devon-ring2", message: "Schooling started", time: "9:30", createdAt: new Date() },
      { id: "a4", ringId: "devon-ring3", message: "Hold: Course Change", time: "9:20", createdAt: new Date() },
    ];
    actData.forEach(a => this.activities.set(a.id, a));
  }

  // ---- Users ----
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

  // ---- Shows ----
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
  async deleteShow(id: string) {
    return this.shows.delete(id);
  }

  // ---- Staff ----
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

  // ---- Rings ----
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

  // ---- Classes ----
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

  // ---- Activities ----
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

  // ---- Follows ----
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
}

export const storage = new MemStorage();
