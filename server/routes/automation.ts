// server/routes/automation.ts

import { Router } from "express";
import { storage } from "../storage";
import { handlePostShowing } from "../automation.ts"; // Import the logic
import { z } from "zod";

const router = Router();

const triggerSchema = z.object({
  visitId: z.string().uuid(),
});

router.post("/trigger-post-showing", async (req, res) => {
  const validation = triggerSchema.safeParse(req.body);
  if (!validation.success) {
    return res
      .status(400)
      .json({ error: "Invalid input", details: validation.error.flatten() });
  }

  try {
    // We need the full visit object to pass to the handler
    const visit = await storage.getVisitById(validation.data.visitId); // <-- We will need to create this function
    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    // Call the business logic from the other file
    await handlePostShowing(visit);

    res
      .status(202)
      .json({ message: "Post-showing automation triggered successfully." });
  } catch (error) {
    console.error("Error triggering post-showing automation:", error);
    res.status(500).json({ error: "Failed to trigger automation" });
  }
});

export default router;
