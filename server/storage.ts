import { type Show, type Ring, type Activity } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getShows(): Promise<Show[]>;
  getShow(id: string): Promise<Show | undefined>;
  getRingsByShow(showId: string): Promise<Ring[]>;
  getRing(id: string): Promise<Ring | undefined>;
  updateRing(id: string, updates: Partial<Ring>): Promise<Ring | undefined>;
  getActivities(ringId: string): Promise<Activity[]>;
  addActivity(ringId: string, message: string, time: string): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private shows: Map<string, Show>;
  private rings: Map<string, Ring>;
  private activities: Map<string, Activity>;

  constructor() {
    this.shows = new Map();
    this.rings = new Map();
    this.activities = new Map();
    this.seed();
  }

  private seed() {
    // Seed shows
    const showData: Show[] = [
      { id: "devon", name: "Devon Horse Show" },
      { id: "wef3", name: "WEF- Week 3" },
      { id: "upperville", name: "Upperville Colt & Horse" },
      { id: "local-jumper", name: "Local Jumper Classic" },
    ];
    showData.forEach(s => this.shows.set(s.id, s));

    // Seed rings for Devon
    const ringData: Ring[] = [
      {
        id: "devon-ring1",
        showId: "devon",
        name: "Ring 1",
        discipline: "Hunters",
        status: "showing",
        holdReason: null,
        currentClassName: "Children's Hunters",
        currentClassNumber: 3,
        totalClasses: 5,
        tripsCompleted: 8,
        totalTrips: 14,
        nextClassName: "Children's Hunter U/S",
        updatedAt: "30s ago",
      },
      {
        id: "devon-ring2",
        showId: "devon",
        name: "Ring 2",
        discipline: "Jumpers",
        status: "schooling",
        holdReason: null,
        currentClassName: "1.20m Jumpers",
        currentClassNumber: 1,
        totalClasses: 3,
        tripsCompleted: 2,
        totalTrips: 18,
        nextClassName: "1.30m Jumpers",
        updatedAt: "30s ago",
      },
      {
        id: "devon-ring3",
        showId: "devon",
        name: "Ring 3",
        discipline: "Eq",
        status: "hold",
        holdReason: "Course Change",
        currentClassName: "Children's Equitation",
        currentClassNumber: 2,
        totalClasses: 4,
        tripsCompleted: 0,
        totalTrips: 12,
        nextClassName: "Adult Equitation",
        updatedAt: "30s ago",
      },
    ];
    ringData.forEach(r => this.rings.set(r.id, r));

    // Seed activities
    const actData: Activity[] = [
      { id: "a1", ringId: "devon-ring1", message: "Showing resumed", time: "9:42" },
      { id: "a2", ringId: "devon-ring1", message: "Drag Break", time: "9:35" },
      { id: "a3", ringId: "devon-ring2", message: "Schooling started", time: "9:30" },
      { id: "a4", ringId: "devon-ring3", message: "Hold: Course Change", time: "9:20" },
    ];
    actData.forEach(a => this.activities.set(a.id, a));
  }

  async getShows(): Promise<Show[]> {
    return Array.from(this.shows.values());
  }

  async getShow(id: string): Promise<Show | undefined> {
    return this.shows.get(id);
  }

  async getRingsByShow(showId: string): Promise<Ring[]> {
    return Array.from(this.rings.values()).filter(r => r.showId === showId);
  }

  async getRing(id: string): Promise<Ring | undefined> {
    return this.rings.get(id);
  }

  async updateRing(id: string, updates: Partial<Ring>): Promise<Ring | undefined> {
    const ring = this.rings.get(id);
    if (!ring) return undefined;
    const updated = { ...ring, ...updates, updatedAt: "just now" };
    this.rings.set(id, updated);
    return updated;
  }

  async getActivities(ringId: string): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.ringId === ringId)
      .reverse();
  }

  async addActivity(ringId: string, message: string, time: string): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { id, ringId, message, time };
    this.activities.set(id, activity);
    return activity;
  }
}

export const storage = new MemStorage();
