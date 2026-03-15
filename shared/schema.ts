import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ============ USERS & AUTH ============

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // bcrypt hash
  name: text("name").notNull(),
  role: text("role").notNull().default("viewer"), // organizer | staff | viewer
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ SHOWS (multi-tenant) ============

export const shows = pgTable("shows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: varchar("organizer_id").notNull(), // references users.id
  name: text("name").notNull(),
  location: text("location"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShowSchema = createInsertSchema(shows).omit({ id: true, createdAt: true });
export type InsertShow = z.infer<typeof insertShowSchema>;
export type Show = typeof shows.$inferSelect;

// ============ STAFF ASSIGNMENTS ============

export const staffAssignments = pgTable("staff_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  showId: varchar("show_id").notNull(),
  userId: varchar("user_id").notNull(),
  ringId: varchar("ring_id"), // null = assigned to whole show
  role: text("role").notNull().default("ring_operator"), // ring_operator | show_admin
});

export const insertStaffAssignmentSchema = createInsertSchema(staffAssignments).omit({ id: true });
export type InsertStaffAssignment = z.infer<typeof insertStaffAssignmentSchema>;
export type StaffAssignment = typeof staffAssignments.$inferSelect;

// ============ RINGS ============

export const rings = pgTable("rings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  showId: varchar("show_id").notNull(),
  name: text("name").notNull(),
  discipline: text("discipline").notNull(),
  status: text("status").notNull().default("showing"), // showing | schooling | hold
  holdReason: text("hold_reason"),
  currentClassName: text("current_class_name"),
  currentClassNumber: integer("current_class_number").default(1),
  totalClasses: integer("total_classes").default(1),
  tripsCompleted: integer("trips_completed").default(0),
  totalTrips: integer("total_trips").default(0),
  nextClassName: text("next_class_name"),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRingSchema = createInsertSchema(rings).omit({ id: true, updatedAt: true });
export type InsertRing = z.infer<typeof insertRingSchema>;
export type Ring = typeof rings.$inferSelect;

// ============ CLASSES (per ring schedule) ============

export const classes = pgTable("classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ringId: varchar("ring_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  totalTrips: integer("total_trips").default(0),
});

export const insertClassSchema = createInsertSchema(classes).omit({ id: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ShowClass = typeof classes.$inferSelect;

// ============ ACTIVITY LOG ============

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ringId: varchar("ring_id").notNull(),
  message: text("message").notNull(),
  time: text("time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// ============ VIEWER FOLLOWS & ALERTS ============

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  ringId: varchar("ring_id").notNull(),
  alertClassNearby: boolean("alert_class_nearby").default(false),
  alertSchoolingStarts: boolean("alert_schooling_starts").default(false),
  alertRingResumes: boolean("alert_ring_resumes").default(false),
});

export const insertFollowSchema = createInsertSchema(follows).omit({ id: true });
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;

// ============ VALIDATION SCHEMAS FOR API ============

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["organizer", "staff", "viewer"]).default("viewer"),
});
