// server/routes/showings.ts

import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// Define the expected input shape for starting a showing
const startShowingSchema = z.object({
  leadId: z.string().uuid(),
  agentId: z.string(),
  projectId: z.string().uuid(),
});

// Define the expected input shape for logging a viewed unit
const logViewSchema = z.object({
  unitId: z.string().uuid(),
});

// --- THIS IS THE MISSING ENDPOINT ---
// API Endpoint: POST /api/showings/start
router.post("/start", async (req, res) => {
  console.log("Attempting to start a new showing session...");

  // 1. Validate the input from the frontend
  const validation = startShowingSchema.safeParse(req.body);
  if (!validation.success) {
    console.error("Invalid input for starting showing:", validation.error);
    return res
      .status(400)
      .json({ error: "Invalid input", details: validation.error.flatten() });
  }

  try {
    // 2. Call the storage layer to create the visit in the database
    const newVisit = await storage.createVisit(validation.data);

    console.log(`Successfully started showing session: ${newVisit.id}`);

    // 3. Send the new visit ID back to the frontend
    res.status(201).json(newVisit);
  } catch (error) {
    console.error("Error creating new showing session:", error);
    res.status(500).json({ error: "Failed to start showing session" });
  }
});
// --- END OF MISSING ENDPOINT ---

// API Endpoint: POST /api/showings/:visitId/log-view
router.post("/:visitId/log-view", async (req, res) => {
  const { visitId } = req.params;
  console.log(`Attempting to log a viewed unit for visit: ${visitId}`);

  // 1. Validate the input from the frontend
  const validation = logViewSchema.safeParse(req.body);
  if (!validation.success) {
    console.error("Invalid input for logging view:", validation.error);
    return res
      .status(400)
      .json({ error: "Invalid input", details: validation.error.flatten() });
  }

  try {
    // 2. Call the storage layer to create the viewed_units record
    const { unitId } = validation.data;
    const newViewedUnit = await storage.logUnitView(visitId, unitId);

    console.log(
      `Successfully logged view for unit ${unitId} on visit ${visitId}`,
    );

    // 3. Send the new record back to the frontend
    res.status(201).json(newViewedUnit);
  } catch (error) {
    console.error(`Error logging unit view for visit ${visitId}:`, error);
    res.status(500).json({ error: "Failed to log unit view" });
  }
});

// API Endpoint: GET /api/showings/:visitId/summary
router.get("/:visitId/summary", async (req, res) => {
  const { visitId } = req.params;
  console.log(`Fetching summary for visit: ${visitId}`);

  try {
    const viewedUnitsSummary = await storage.getVisitSummary(visitId);

    if (!viewedUnitsSummary) {
      return res
        .status(404)
        .json({ error: "Visit not found or no units viewed." });
    }

    console.log(
      `Found ${viewedUnitsSummary.length} viewed units for visit ${visitId}`,
    );
    res.status(200).json(viewedUnitsSummary);
  } catch (error) {
    console.error(`Error fetching summary for visit ${visitId}:`, error);
    res.status(500).json({ error: "Failed to fetch visit summary" });
  }
});

export default router;