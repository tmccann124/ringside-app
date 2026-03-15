import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Get all shows
  app.get("/api/shows", async (_req, res) => {
    const shows = await storage.getShows();
    res.json(shows);
  });

  // Get single show
  app.get("/api/shows/:id", async (req, res) => {
    const show = await storage.getShow(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });
    res.json(show);
  });

  // Get rings for a show
  app.get("/api/shows/:showId/rings", async (req, res) => {
    const rings = await storage.getRingsByShow(req.params.showId);
    res.json(rings);
  });

  // Get single ring
  app.get("/api/rings/:id", async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });
    res.json(ring);
  });

  // Update ring (for official control)
  app.patch("/api/rings/:id", async (req, res) => {
    const updated = await storage.updateRing(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Ring not found" });
    res.json(updated);
  });

  // Get activities for a ring
  app.get("/api/rings/:ringId/activities", async (req, res) => {
    const activities = await storage.getActivities(req.params.ringId);
    res.json(activities);
  });

  // Add activity
  app.post("/api/rings/:ringId/activities", async (req, res) => {
    const { message, time } = req.body;
    const activity = await storage.addActivity(req.params.ringId, message, time);
    res.json(activity);
  });

  // Increment trip
  app.post("/api/rings/:id/trip", async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });
    const direction = req.body.direction || "increment";
    const newTrips = direction === "increment"
      ? Math.min((ring.tripsCompleted || 0) + 1, ring.totalTrips || 99)
      : Math.max((ring.tripsCompleted || 0) - 1, 0);
    const updated = await storage.updateRing(req.params.id, { tripsCompleted: newTrips });
    res.json(updated);
  });

  // Navigate class
  app.post("/api/rings/:id/navigate-class", async (req, res) => {
    const ring = await storage.getRing(req.params.id);
    if (!ring) return res.status(404).json({ error: "Ring not found" });
    const direction = req.body.direction; // "next" or "previous"
    const current = ring.currentClassNumber || 1;
    const total = ring.totalClasses || 5;
    let newClass = current;
    if (direction === "next" && current < total) newClass = current + 1;
    if (direction === "previous" && current > 1) newClass = current - 1;
    const updated = await storage.updateRing(req.params.id, {
      currentClassNumber: newClass,
      tripsCompleted: 0,
    });
    res.json(updated);
  });

  return httpServer;
}
