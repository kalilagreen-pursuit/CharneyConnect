import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  unitStatuses,
  type UnitUpdateRequest,
  insertLeadSchema,
  contacts,
  deals,
  activities,
  leads,
} from "@shared/schema";
import { z } from "zod";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import ragRoutes from "../src/server/routes/rag.ts"; // 1. IMPORT YOUR NEW RAG ROUTER
import { db } from "./db";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  app.get("/api/units/:projectId/:unitNumber/leads", async (req, res) => {
    try {
      const { projectId, unitNumber } = req.params;
      const leads = await storage.getLeadsByUnit(projectId, unitNumber);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching unit leads:", error);
      res.status(500).json({ error: "Failed to fetch unit leads" });
    }
  });

  app.get("/api/agents/:agentId/units", async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const showAllProjectUnits = req.query.showAllProjectUnits === 'true';
      const units = await storage.getUnitsByAgentId(req.params.agentId, projectId, showAllProjectUnits);
      res.json(units);
    } catch (error) {
      console.error("Error fetching agent units:", error);
      res.status(500).json({ error: "Failed to fetch agent units" });
    }
  });

  app.get("/api/agents/:agentId/active-deals", async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const activeDeals = await storage.getActiveDealsByAgentId(req.params.agentId, projectId);
      res.json(activeDeals);
    } catch (error) {
      console.error("Error fetching active deals:", error);
      res.status(500).json({ error: "Failed to fetch active deals" });
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

  // Contacts endpoints
  app.post("/api/contacts", async (req, res) => {
    try {
      const contactSchema = z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        contactType: z.enum(['buyer', 'broker']),
        consentGivenAt: z.string().optional(),
      });

      const validation = contactSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const { consentGivenAt, ...contactData } = validation.data;
      const contact = await storage.createContact({
        ...contactData,
        consentGivenAt: consentGivenAt ? new Date(consentGivenAt) : undefined,
      });

      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  // Deals endpoints
  app.post("/api/deals", async (req, res) => {
    try {
      const dealSchema = z.object({
        unitId: z.string().uuid(),
        buyerContactId: z.string().uuid(),
        brokerContactId: z.string().uuid().optional(),
        agentId: z.string(),
        dealStage: z.string(),
        salePrice: z.string().optional(),
        category: z.string().optional(),
      });

      const validation = dealSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const deal = await storage.createDealLead(validation.data);
      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // Activities endpoints
  app.post("/api/activities", async (req, res) => {
    try {
      const activitySchema = z.object({
        dealId: z.string().uuid(),
        activityType: z.string(),
        notes: z.string(),
      });

      const validation = activitySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const activity = await storage.createActivity(validation.data);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ error: "Failed to create activity" });
    }
  });

  // Prospects endpoint - atomic creation of Contact + Deal + Activity
  app.post("/api/prospects", async (req, res) => {
    try {
      const prospectSchema = z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        unitId: z.string().uuid(),
        unitNumber: z.string(),
        agentId: z.string(),
        consentGiven: z.boolean(),
      });

      const validation = prospectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validation.error.message 
        });
      }

      const { firstName, lastName, email, phone, unitId, unitNumber, agentId, consentGiven } = validation.data;

      // Use Drizzle transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Step 1: Create Contact
        const [contact] = await tx.insert(contacts).values({
          firstName,
          lastName,
          email,
          phone,
          contactType: 'buyer',
          consentGivenAt: consentGiven ? new Date() : undefined,
        }).returning();

        // Step 2: Create Deal linking contact to unit
        const [deal] = await tx.insert(deals).values({
          unitId,
          buyerContactId: contact.id,
          agentId,
          dealStage: 'inquiry',
          category: 'in_person_inquiry',
        }).returning();

        // Step 3: Create Activity to log the inquiry
        const [activity] = await tx.insert(activities).values({
          dealId: deal.id,
          activityType: 'in_person_inquiry',
          notes: `Initial inquiry for Unit ${unitNumber}. Marketing consent: ${consentGiven ? 'Given' : 'Not given'}`,
        }).returning();

        // Step 4: Create Lead in public.leads table for pipeline tracking
        const [lead] = await tx.insert(leads).values({
          name: `${firstName} ${lastName}`,
          email,
          phone,
          status: 'new',
          pipelineStage: 'new',
          agentId,
        }).returning();

        return { contact, deal, activity, lead };
      });

      console.log('[API] Prospect created successfully (atomic transaction)', {
        contactId: result.contact.id,
        dealId: result.deal.id,
        activityId: result.activity.id,
        leadId: result.lead.id,
        unitId,
        agentId,
      });

      res.status(201).json({
        contact: result.contact,
        deal: result.deal,
        activity: result.activity,
        lead: result.lead,
        message: 'Prospect added successfully',
      });
    } catch (error) {
      console.error("Error creating prospect:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        error: "Failed to create prospect. Please try again.",
        details: errorMessage
      });
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
      const { agentId, targetPriceMin, targetPriceMax, ...otherUpdates } = validation.data;

      const updatedLead = await storage.updateLead(
        req.params.id,
        { 
          ...otherUpdates, 
          agentId,
          targetPriceMin: targetPriceMin?.toString(),
          targetPriceMax: targetPriceMax?.toString(),
        },
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

      const { assignedAgentId, leadId, dueDate, ...rest } = validation.data;
      
      if (!leadId) {
        return res.status(400).json({ error: "leadId is required" });
      }

      const task = await storage.createTask({
        agentId: assignedAgentId,
        leadId,
        title: rest.title,
        description: rest.description,
        priority: rest.priority,
        status: rest.status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
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

      const { completedAt, ...rest } = validation.data;
      const task = await storage.updateTask(req.params.id, {
        ...rest,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      });
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // AI Chat Assistant endpoint with persistence
  app.post("/api/chat/strategy", async (req, res) => {
    try {
      const chatSchema = z.object({
        message: z.string(),
        conversationId: z.string().optional(),
        agentId: z.string().default("default_agent"), // Default agent if not provided
      });

      const validation = chatSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const { message, agentId } = validation.data;
      let conversationId = validation.data.conversationId || `conv_${Date.now()}`;
      
      // Check if conversation exists, if not create it
      let conversation = await storage.getConversationByConversationId(conversationId);
      if (!conversation) {
        conversation = await storage.createConversation({
          conversationId,
          agentId,
        });
      }
      
      // Load conversation history from database
      const dbMessages = await storage.getMessagesByConversationId(conversationId);
      const history = dbMessages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));
      
      // Save user message to database
      await storage.createMessage({
        conversationId,
        role: "user",
        content: message
      });

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp" 
      });

      // Define system persona
      const systemPersona = `You are the Charney Sales Assistant, an expert AI strategist for luxury condo sales. 
You help real estate agents with:
- Property details and unit specifications
- Objection handling and closing techniques  
- Buyer qualification and matching strategies
- Market intelligence and competitive positioning

Provide concise, actionable advice that agents can use immediately in sales conversations.
Be professional, confident, and focused on closing deals.`;

      // Build conversation history with database messages
      let conversationContext = systemPersona + "\n\n";
      
      if (history.length > 0) {
        conversationContext += "Previous conversation:\n";
        history.forEach((msg) => {
          const label = msg.role === "user" ? "Agent" : "Assistant";
          conversationContext += `${label}: ${msg.content}\n\n`;
        });
      }

      conversationContext += `Agent: ${message}\n\nYour Response:`;

      // Call Gemini API
      const result = await model.generateContent(conversationContext);
      const response = result.response;
      const answer = response.text();
      
      // Save AI response to database
      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: answer
      });
      
      // Update conversation timestamp
      await storage.touchConversation(conversationId);

      res.json({ 
        message: answer,
        conversationId
      });
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: "Failed to process chat message" });
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
