import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  unitStatuses,
  type UnitUpdateRequest,
  insertLeadSchema,
} from "@shared/schema";
import { z } from "zod";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import ragRoutes from "../src/server/routes/rag.ts"; // 1. IMPORT YOUR NEW RAG ROUTER

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const updateStatusSchema = z.object({
  status: z.enum(unitStatuses),
});

const updatePriceSchema = z.object({
  price: z.number().positive(),
});

const updateLeadSchema = insertLeadSchema.partial();

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static 3D models and assets from public folder
  const publicPath = path.resolve(__dirname, "..", "public");
  app.use(express.static(publicPath));

  // Units endpoints
  app.get("/api/units", async (req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:id", async (req, res) => {
    try {
      const unit = await storage.getUnitById(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error fetching unit:", error);
      res.status(500).json({ error: "Failed to fetch unit" });
    }
  });

  app.get("/api/agents/:agentId/units", async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const units = await storage.getUnitsByAgentId(req.params.agentId, projectId);
      res.json(units);
    } catch (error) {
      console.error("Error fetching agent units:", error);
      res.status(500).json({ error: "Failed to fetch agent units" });
    }
  });

  app.put("/api/units/:id/status", async (req, res) => {
    try {
      const validation = updateStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const updatedUnit = await storage.updateUnitStatus(
        req.params.id,
        validation.data.status,
      );

      if (!updatedUnit) {
        return res.status(404).json({ error: "Unit not found" });
      }

      // Broadcast update to all WebSocket clients
      broadcastUnitUpdate(updatedUnit);

      res.json(updatedUnit);
    } catch (error) {
      console.error("Error updating unit status:", error);
      res.status(500).json({ error: "Failed to update unit status" });
    }
  });

  app.put("/api/units/:id/price", async (req, res) => {
    try {
      const validation = updatePriceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const updatedUnit = await storage.updateUnitPrice(
        req.params.id,
        validation.data.price,
      );

      if (!updatedUnit) {
        return res.status(404).json({ error: "Unit not found" });
      }

      // Broadcast update to all WebSocket clients
      broadcastUnitUpdate(updatedUnit);

      res.json(updatedUnit);
    } catch (error) {
      console.error("Error updating unit price:", error);
      res.status(500).json({ error: "Failed to update unit price" });
    }
  });

  // Projects endpoints
  app.get("/api/projects/counts", async (req, res) => {
    try {
      const projectCounts = await storage.getProjectCounts();
      res.json(projectCounts);
    } catch (error) {
      console.error("Error fetching project counts:", error);
      res.status(500).json({ error: "Failed to fetch project counts" });
    }
  });

  // Leads endpoints
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLeadById(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validation = insertLeadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const newLead = await storage.createLead(validation.data);

      // Broadcast update to all WebSocket clients
      broadcastLeadUpdate(newLead, "created");

      res.status(201).json(newLead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const validation = updateLeadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const updatedLead = await storage.updateLead(
        req.params.id,
        validation.data,
      );

      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Broadcast update to all WebSocket clients
      broadcastLeadUpdate(updatedLead, "updated");

      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Lead Qualification & Matching endpoints
  app.get("/api/leads/:id/matched-units", async (req, res) => {
    try {
      const matchedUnits = await storage.getMatchingUnitsForLead(req.params.id);
      res.json(matchedUnits);
    } catch (error) {
      console.error("Error fetching matched units:", error);
      res.status(500).json({ error: "Failed to fetch matched units" });
    }
  });

  app.post("/api/leads/:id/qualify", async (req, res) => {
    try {
      const qualifySchema = z.object({
        targetPriceMin: z.number().optional(),
        targetPriceMax: z.number().optional(),
        targetLocations: z.array(z.string()).optional(),
        timeFrameToBuy: z.string().optional(),
        pipelineStage: z.string().optional(),
        leadScore: z.number().min(0).max(100).optional(),
        agentId: z.string().optional(),
      });

      const validation = qualifySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const existingLead = await storage.getLeadById(req.params.id);
      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const oldStage = existingLead.pipelineStage || "";
      const { agentId, ...leadUpdates } = validation.data;

      const updatedLead = await storage.updateLead(
        req.params.id,
        { ...leadUpdates, agentId },
      );

      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      if (validation.data.pipelineStage && agentId) {
        const { handlePipelineStageChange } = await import("./automation");
        await handlePipelineStageChange(
          updatedLead,
          oldStage,
          validation.data.pipelineStage,
          agentId
        );
      }

      broadcastLeadUpdate(updatedLead, "updated");
      res.json(updatedLead);
    } catch (error) {
      console.error("Error qualifying lead:", error);
      res.status(500).json({ error: "Failed to qualify lead" });
    }
  });

  // Engagement tracking endpoints
  app.post("/api/leads/:id/engagement", async (req, res) => {
    try {
      const engagementSchema = z.object({
        eventType: z.string(),
        eventDescription: z.string(),
        scoreImpact: z.number(),
        agentId: z.string().optional(),
      });

      const validation = engagementSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const { agentId, ...engagementData } = validation.data;

      const engagement = await storage.createLeadEngagement({
        leadId: req.params.id,
        ...engagementData,
      });

      const newScore = await storage.calculateLeadScore(req.params.id);

      const hasSpike = await storage.detectEngagementSpike(req.params.id);
      if (hasSpike && agentId) {
        const lead = await storage.getLeadById(req.params.id);
        if (lead) {
          const { handleEngagementSpike } = await import("./automation");
          await handleEngagementSpike(lead, agentId);
        }
      }

      res.status(201).json({ engagement, newScore, hasSpike });
    } catch (error) {
      console.error("Error logging engagement:", error);
      res.status(500).json({ error: "Failed to log engagement" });
    }
  });

  app.get("/api/leads/:id/engagement", async (req, res) => {
    try {
      const engagements = await storage.getLeadEngagementByLeadId(req.params.id);
      res.json(engagements);
    } catch (error) {
      console.error("Error fetching engagements:", error);
      res.status(500).json({ error: "Failed to fetch engagements" });
    }
  });

  app.get("/api/leads/:id/engagement/spike", async (req, res) => {
    try {
      const hasSpike = await storage.detectEngagementSpike(req.params.id);
      res.json({ hasSpike });
    } catch (error) {
      console.error("Error detecting engagement spike:", error);
      res.status(500).json({ error: "Failed to detect engagement spike" });
    }
  });

  // Task management endpoints
  app.get("/api/agents/:agentId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByAgentId(req.params.agentId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskSchema = z.object({
        title: z.string(),
        description: z.string().optional(),
        taskType: z.string(),
        priority: z.string(),
        status: z.string(),
        assignedAgentId: z.string(),
        leadId: z.string().optional(),
        unitId: z.string().optional(),
        dueDate: z.string().optional(),
      });

      const validation = taskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const task = await storage.createTask(validation.data);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const taskUpdateSchema = z.object({
        status: z.string().optional(),
        completedAt: z.string().optional(),
      });

      const validation = taskUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const task = await storage.updateTask(req.params.id, validation.data);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.use("/api", ragRoutes);

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on("message", (message: string) => {
      console.log("Received message:", message.toString());
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Send initial connection confirmation
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "WebSocket connected successfully",
        }),
      );
    }
  });

  // Function to broadcast unit updates to all connected clients
  function broadcastUnitUpdate(unit: any) {
    const message = JSON.stringify({
      type: "unit_update",
      data: unit,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Function to broadcast lead updates to all connected clients
  function broadcastLeadUpdate(
    lead: any,
    action: "created" | "updated" | "deleted",
  ) {
    const message = JSON.stringify({
      type: "lead_update",
      action,
      data: lead,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Store broadcast functions globally so they can be used from routes
  (global as any).broadcastUnitUpdate = broadcastUnitUpdate;
  (global as any).broadcastLeadUpdate = broadcastLeadUpdate;

  return httpServer;
}
