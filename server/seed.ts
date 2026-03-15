/**
 * Database seed script — run once after first migration to populate demo data.
 * Usage: DATABASE_URL=postgres://... npx tsx server/seed.ts
 */
import { db } from "./db";
import { users, shows, staffAssignments, rings, classes, activities } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Check if already seeded
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already has data — skipping seed.");
    process.exit(0);
  }

  // Demo organizer
  const orgPw = await bcrypt.hash("demo123", 10);
  await db.insert(users).values({
    id: "demo-organizer",
    email: "organizer@ringside.app",
    password: orgPw,
    name: "Demo Organizer",
    role: "organizer",
  });

  // Demo staff
  const staffPw = await bcrypt.hash("staff123", 10);
  await db.insert(users).values({
    id: "demo-staff",
    email: "staff@ringside.app",
    password: staffPw,
    name: "Demo Staff",
    role: "staff",
  });

  // Shows
  await db.insert(shows).values([
    { id: "devon", organizerId: "demo-organizer", name: "Devon Horse Show", location: "Devon, PA", startDate: "2026-05-20", endDate: "2026-05-31", isActive: true },
    { id: "wef3", organizerId: "demo-organizer", name: "WEF- Week 3", location: "Wellington, FL", startDate: "2026-02-01", endDate: "2026-02-08", isActive: true },
    { id: "upperville", organizerId: "demo-organizer", name: "Upperville Colt & Horse", location: "Upperville, VA", startDate: "2026-06-01", endDate: "2026-06-07", isActive: true },
    { id: "local-jumper", organizerId: "demo-organizer", name: "Local Jumper Classic", location: "Princeton, NJ", startDate: "2026-04-15", endDate: "2026-04-17", isActive: true },
  ]);

  // Staff assignment
  await db.insert(staffAssignments).values({
    id: "sa1",
    showId: "devon",
    userId: "demo-staff",
    ringId: null,
    role: "ring_operator",
  });

  // Rings
  await db.insert(rings).values([
    { id: "devon-ring1", showId: "devon", name: "Ring 1", discipline: "Hunters", status: "showing", currentClassName: "Children's Hunters", currentClassNumber: 3, totalClasses: 5, tripsCompleted: 8, totalTrips: 14, nextClassName: "Children's Hunter U/S", sortOrder: 1 },
    { id: "devon-ring2", showId: "devon", name: "Ring 2", discipline: "Jumpers", status: "schooling", currentClassName: "1.20m Jumpers", currentClassNumber: 1, totalClasses: 3, tripsCompleted: 2, totalTrips: 18, nextClassName: "1.30m Jumpers", sortOrder: 2 },
    { id: "devon-ring3", showId: "devon", name: "Ring 3", discipline: "Eq", status: "hold", holdReason: "Course Change", currentClassName: "Children's Equitation", currentClassNumber: 2, totalClasses: 4, tripsCompleted: 0, totalTrips: 12, nextClassName: "Adult Equitation", sortOrder: 3 },
  ]);

  // Classes for Ring 1
  await db.insert(classes).values([
    { id: "c1", ringId: "devon-ring1", name: "Small Hunters", sortOrder: 1, totalTrips: 12 },
    { id: "c2", ringId: "devon-ring1", name: "Large Hunters", sortOrder: 2, totalTrips: 10 },
    { id: "c3", ringId: "devon-ring1", name: "Children's Hunters", sortOrder: 3, totalTrips: 14 },
    { id: "c4", ringId: "devon-ring1", name: "Children's Hunter U/S", sortOrder: 4, totalTrips: 14 },
    { id: "c5", ringId: "devon-ring1", name: "Adult Hunters", sortOrder: 5, totalTrips: 16 },
  ]);

  // Activity log
  await db.insert(activities).values([
    { id: "a1", ringId: "devon-ring1", message: "Showing resumed", time: "9:42" },
    { id: "a2", ringId: "devon-ring1", message: "Drag Break", time: "9:35" },
    { id: "a3", ringId: "devon-ring2", message: "Schooling started", time: "9:30" },
    { id: "a4", ringId: "devon-ring3", message: "Hold: Course Change", time: "9:20" },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
