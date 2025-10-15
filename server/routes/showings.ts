// server/routes/showings.ts

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { touredUnits } from "../../shared/schema"; // CORRECTED PATH
import { eq } from "drizzle-orm";
import { db } from "../db"; // ADD THIS IMPORT
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

// API Endpoint: POST /api/showings/:sessionId/log-view
router.post("/:sessionId/log-view", async (req, res) => {
  const { sessionId } = req.params;
  console.log(`Attempting to log a toured unit for session: ${sessionId}`);
  // 1. Validate the input from the frontend
  const validation = logViewSchema.safeParse(req.body);
  if (!validation.success) {
    console.error("Invalid input for logging view:", validation.error);
    return res
      .status(400)
      .json({ error: "Invalid input", details: validation.error.flatten() });
  }
  try {
    // 2. Call the storage layer to create the toured_units record
    const { unitId } = validation.data;
    const newTouredUnit = await storage.logTouredUnit(sessionId, unitId);
    console.log(
      `Successfully logged toured unit ${unitId} for session ${sessionId}`,
    );
    // 3. Send the new record back to the frontend
    res.status(201).json(newTouredUnit);
  } catch (error) {
    console.error(`Error logging toured unit for session ${sessionId}:`, error);
    res.status(500).json({ error: "Failed to log toured unit" });
  }
});

// API Endpoint: GET /api/showings/:sessionId/summary
router.get("/:sessionId/summary", async (req, res) => {
  const { sessionId } = req.params;
  console.log(`Fetching summary for session: ${sessionId}`);
  try {
    // Query toured_units instead of viewed_units
    const touredUnitsSummary = await db
      .select({
        id: touredUnits.id,
        unitId: touredUnits.unitId,
        viewedAt: touredUnits.viewedAt,
        agentNotes: touredUnits.agentNotes,
        clientInterestLevel: touredUnits.clientInterestLevel,
      })
      .from(touredUnits)
      .where(eq(touredUnits.sessionId, sessionId));
    console.log(
      `Found ${touredUnitsSummary.length} toured units for session ${sessionId}`,
    );
    res.status(200).json(touredUnitsSummary);
  } catch (error) {
    console.error(`Error fetching summary for session ${sessionId}:`, error);
    res.status(500).json({ error: "Failed to fetch session summary" });
  }
});

export default router;
