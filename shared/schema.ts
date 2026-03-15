import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Shows
export const shows = pgTable("shows", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertShowSchema = createInsertSchema(shows);
export type InsertShow = z.infer<typeof insertShowSchema>;
export type Show = typeof shows.$inferSelect;

// Rings
export const rings = pgTable("rings", {
  id: varchar("id").primaryKey(),
  showId: varchar("show_id").notNull(),
  name: text("name").notNull(),
  discipline: text("discipline").notNull(),
  status: text("status").notNull().default("showing"), // showing | schooling | hold
  holdReason: text("hold_reason"),
  currentClassName: text("current_class_name"),
  currentClassNumber: integer("current_class_number").default(1),
  totalClasses: integer("total_classes").default(5),
  tripsCompleted: integer("trips_completed").default(0),
  totalTrips: integer("total_trips").default(14),
  nextClassName: text("next_class_name"),
  updatedAt: text("updated_at"),
});

export const insertRingSchema = createInsertSchema(rings);
export type InsertRing = z.infer<typeof insertRingSchema>;
export type Ring = typeof rings.$inferSelect;

// Activity log
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey(),
  ringId: varchar("ring_id").notNull(),
  message: text("message").notNull(),
  time: text("time").notNull(),
});

export const insertActivitySchema = createInsertSchema(activities);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
