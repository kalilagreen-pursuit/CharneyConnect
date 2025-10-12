// server/routes.ts

import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { unitStatuses, insertLeadSchema } from "@shared/schema";
import { z } from "zod";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { contacts, deals, activities, leads } from "@shared/schema";

// FIXED: Add the missing import for Google Generative AI
import { GoogleGenerativeAI } from "@google/generative-ai";

// FIXED: Correctly import all routers from their location in the './routes/' subdirectory.
import ragRoutes from "../src/server/routes/rag.ts";
import showingsRoutes from "../server/routes/showings.ts";
import automationsRoutes from "../server/routes/automation.ts";

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

  // --- MOUNT ALL API ROUTERS AT THE TOP FOR CLARITY ---
  // Each router now has its own specific base path.
  app.use("/api/rag", ragRoutes);
  app.use("/api/showings", showingsRoutes);
  app.use("/api/automations", automationsRoutes);

  // --- YOUR EXISTING API ENDPOINTS (PRESERVED) ---

  // Agents endpoints
  app.get("/api/agents", async (req, res) => {
    try {
      console.log("[API] GET /api/agents - Fetching all agents");
      const agents = await storage.getAllAgents();
      console.log(`[API] Returning ${agents.length} agents to client`);
      res.json(agents);
    } catch (error) {
      console.error("[API] Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

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

  // THIS IS THE ENDPOINT THAT WAS BROKEN AND IS NOW FIXED
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
      // Ensure broadcastUnitUpdate is defined in this scope or passed in
      (global as any).broadcastUnitUpdate(updatedUnit);

      res.json(updatedUnit);
    } catch (error) {
      console.error("Error updating unit price:", error);
      res.status(500).json({ error: "Failed to update unit price" });
    }
  });

  // THIS IS THE OTHER ENDPOINT FROM YOUR ERROR LOG, NOW CORRECT
  app.get("/api/projects/counts", async (req, res) => {
    try {
      const projectCounts = await storage.getProjectCounts();
      res.json(projectCounts);
    } catch (error) {
      console.error("Error fetching project counts:", error);
      res.status(500).json({ error: "Failed to fetch project counts" });
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
        contactType: z.enum(["buyer", "broker"]),
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

  // Prospect search endpoint - search for existing prospects by name, email, or phone
  app.get("/api/prospects/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }

      const searchTerm = query.trim().toLowerCase();

      // Search contacts by name, email, or phone
      const results = await storage.searchContacts(searchTerm);

      res.json(results);
    } catch (error) {
      console.error("Error searching prospects:", error);
      res.status(500).json({ error: "Failed to search prospects" });
    }
  });

  // Prospects endpoint - atomic creation of Contact + Deal + Activity + Lead with qualification
  app.post("/api/prospects", async (req, res) => {
    try {
      const prospectSchema = z.object({
        contactId: z.string().uuid().optional(), // Optional - existing prospect
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        unitId: z.string().uuid().optional(), // Optional - may not have unit yet
        unitNumber: z.string().optional(),
        agentId: z.string(),
        consentGiven: z.boolean(),
        // Qualification fields (optional)
        targetPriceMin: z.number().optional(),
        targetPriceMax: z.number().optional(),
        targetBedrooms: z.number().optional(),
        targetBathrooms: z.number().optional(),
        targetSqft: z.number().optional(),
        targetBuilding: z.string().optional(),
      });

      const validation = prospectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validation.error.message,
        });
      }

      const {
        contactId,
        firstName,
        lastName,
        email,
        phone,
        unitId,
        unitNumber,
        agentId,
        consentGiven,
        targetPriceMin,
        targetPriceMax,
        targetBedrooms,
        targetBathrooms,
        targetSqft,
        targetBuilding,
      } = validation.data;

      // Use Drizzle transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Step 1: Get or Create Contact
        let contact;
        if (contactId) {
          // Use existing contact
          const existing = await tx
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);
          if (existing.length === 0) {
            throw new Error("Contact not found");
          }
          contact = existing[0];
        } else {
          // Create new contact
          const [newContact] = await tx
            .insert(contacts)
            .values({
              firstName,
              lastName,
              email,
              phone,
              contactType: "buyer",
              consentGivenAt: consentGiven ? new Date() : undefined,
            })
            .returning();
          contact = newContact;
        }

        // Step 2: Create Deal linking contact to unit (if unit specified)
        let deal = null;
        if (unitId) {
          const [createdDeal] = await tx
            .insert(deals)
            .values({
              unitId,
              buyerContactId: contact.id,
              agentId,
              dealStage: "inquiry",
              category: "in_person_inquiry",
            })
            .returning();
          deal = createdDeal;
        }

        // Step 3: Create Activity to log the inquiry (if deal exists)
        let activity = null;
        if (deal) {
          const [createdActivity] = await tx
            .insert(activities)
            .values({
              dealId: deal.id,
              activityType: "in_person_inquiry",
              notes: `Initial inquiry for Unit ${unitNumber}. Marketing consent: ${consentGiven ? "Given" : "Not given"}`,
            })
            .returning();
          activity = createdActivity;
        }

        // Step 4: Create Lead in public.leads table with qualification data
        const leadValues: any = {
          name: `${firstName} ${lastName}`,
          email,
          phone,
          status: "new",
          pipelineStage: "new",
          agentId,
        };

        // Add qualification fields if provided
        if (targetPriceMin)
          leadValues.targetPriceMin = targetPriceMin.toString();
        if (targetPriceMax)
          leadValues.targetPriceMax = targetPriceMax.toString();
        if (targetBedrooms) leadValues.targetBedrooms = targetBedrooms;
        if (targetBathrooms) leadValues.targetBathrooms = targetBathrooms;
        if (targetSqft) leadValues.targetSqft = targetSqft;
        if (targetBuilding) leadValues.targetLocations = [targetBuilding];

        const [lead] = await tx.insert(leads).values(leadValues).returning();

        return { contact, deal, activity, lead };
      });

      // Step 5: Find matched units based on qualification criteria
      let matchedUnits: any[] = [];
      if (
        targetPriceMin ||
        targetPriceMax ||
        targetBedrooms ||
        targetBathrooms ||
        targetSqft ||
        targetBuilding
      ) {
        const allUnits = await storage.getAllUnits();

        matchedUnits = allUnits.filter((unit) => {
          // Only match available units
          if (unit.status !== "available") return false;

          const unitPrice =
            typeof unit.price === "string"
              ? parseFloat(unit.price)
              : unit.price;

          // Price range filter
          if (targetPriceMin && unitPrice < targetPriceMin) return false;
          if (targetPriceMax && unitPrice > targetPriceMax) return false;

          // Bedrooms filter
          if (targetBedrooms && unit.bedrooms !== targetBedrooms) return false;

          // Bathrooms filter
          if (targetBathrooms && unit.bathrooms < targetBathrooms) return false;

          // Square footage filter (minimum)
          if (targetSqft && unit.squareFeet < targetSqft) return false;

          // Building filter
          if (targetBuilding && unit.building !== targetBuilding) return false;

          return true;
        });

        // Sort by price ascending
        matchedUnits.sort((a, b) => {
          const priceA =
            typeof a.price === "string" ? parseFloat(a.price) : a.price;
          const priceB =
            typeof b.price === "string" ? parseFloat(b.price) : b.price;
          return priceA - priceB;
        });
      }

      console.log("[API] Prospect created successfully with qualification", {
        contactId: result.contact.id,
        dealId: result.deal?.id,
        activityId: result.activity?.id,
        leadId: result.lead.id,
        unitId,
        agentId,
        matchedUnits: matchedUnits.length,
        hasQualification: !!(
          targetPriceMin ||
          targetPriceMax ||
          targetBedrooms
        ),
      });

      res.status(201).json({
        contact: result.contact,
        deal: result.deal,
        activity: result.activity,
        lead: result.lead,
        matchedUnits,
        message: "Prospect added successfully",
      });
    } catch (error) {
      console.error("Error creating prospect:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        error: "Failed to create prospect. Please try again.",
        details: errorMessage,
      });
    }
  });

  // Leads endpoints
  app.get("/api/leads", async (req, res) => {
    try {
      const { agentId, projectId, status } = req.query;

      let leads = await storage.getAllLeads();

      // 1. Filter by Agent ID (MUST be preserved, critical for the workflow)
      if (agentId) {
        leads = leads.filter((lead) => lead.agentId === agentId);
        console.log(`[API] Leads after agentId filter: ${leads.length}`);
      }

      // 2. Filter by Status (MUST be preserved for "qualified")
      if (status) {
        leads = leads.filter((lead) => lead.status === status);
        console.log(`[API] Leads after status filter: ${leads.length}`);
      }

      // 3. Filter by Project ID (DEMO FIX: Relaxed to ensure leads load)
      if (projectId) {
        // DEMO MODE: Only filter by project if the lead has valid targetLocations
        // This allows leads without targetLocations to still appear in the list
        console.warn(`[API][DEMO MODE] Relaxed projectId filter for: ${projectId}`);
        
        leads = leads.filter((lead) => {
          // If lead has targetLocations, check if it includes the project
          if (lead.targetLocations && Array.isArray(lead.targetLocations)) {
            return lead.targetLocations.some((loc) => loc === projectId);
          }
          // If lead has no targetLocations, include it anyway (DEMO FIX)
          return true;
        });
        
        console.log(`[API] Leads after relaxed projectId filter: ${leads.length}`);
      }

      console.log(`[API] Final leads returned: ${leads.length}`);
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
      const { agentId, targetPriceMin, targetPriceMax, ...otherUpdates } =
        validation.data;

      const updatedLead = await storage.updateLead(req.params.id, {
        ...otherUpdates,
        agentId,
        targetPriceMin: targetPriceMin?.toString(),
        targetPriceMax: targetPriceMax?.toString(),
      });

      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      if (validation.data.pipelineStage && agentId) {
        const { handlePipelineStageChange } = await import("./automation");
        await handlePipelineStageChange(
          updatedLead,
          oldStage,
          validation.data.pipelineStage,
          agentId,
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
      const engagements = await storage.getLeadEngagementByLeadId(
        req.params.id,
      );
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

  // Cache for property data (refresh every 5 minutes)
  let propertyDataCache: {
    data: string;
    timestamp: number;
  } | null = null;

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const priceFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  async function getPropertyKnowledgeBase(): Promise<string> {
    const now = Date.now();

    // Return cached data if still valid
    if (propertyDataCache && now - propertyDataCache.timestamp < CACHE_TTL) {
      return propertyDataCache.data;
    }

    // Load fresh property data
    const units = await storage.getAllUnits();
    const projectCounts = await storage.getProjectCounts();

    // Group units by building for comprehensive overview
    const unitsByBuilding = units.reduce(
      (acc, unit) => {
        if (!acc[unit.building]) acc[unit.building] = [];
        acc[unit.building].push(unit);
        return acc;
      },
      {} as Record<string, typeof units>,
    );

    const propertyContext = `
AVAILABLE INVENTORY:
${projectCounts
  .map(
    (p) => `
${p.name} (${p.address}):
- Total Units: ${p.totalUnits}
- Available: ${p.available}
- Reserved/Contract: ${p.reserved}
- Sold: ${p.sold}
`,
  )
  .join("\n")}

UNIT SPECIFICATIONS BY BUILDING (All Available Units, Ordered by Price):
${Object.entries(unitsByBuilding)
  .map(([building, buildingUnits]) => {
    const availableUnits = buildingUnits
      .filter((u) => u.status === "Available")
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // Sort by price ascending

    if (availableUnits.length === 0) return "";

    return `
${building} (${availableUnits.length} available):
${availableUnits.map((u) => `- Unit ${u.unitNumber}: ${u.bedrooms}BR/${u.bathrooms}BA, ${u.squareFeet}sqft, ${priceFormatter.format(parseFloat(u.price))}, Floor ${u.floor}`).join("\n")}
`;
  })
  .filter(Boolean)
  .join("\n")}

Total Available Units: ${units.filter((u) => u.status === "Available").length}
Price Range: ${priceFormatter.format(Math.min(...units.map((u) => parseFloat(u.price))))} - ${priceFormatter.format(Math.max(...units.map((u) => parseFloat(u.price))))}
`;

    // Cache the result
    propertyDataCache = {
      data: propertyContext,
      timestamp: now,
    };

    return propertyContext;
  }

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
      let conversationId =
        validation.data.conversationId || `conv_${Date.now()}`;

      // Check if conversation exists, if not create it
      let conversation =
        await storage.getConversationByConversationId(conversationId);
      if (!conversation) {
        conversation = await storage.createConversation({
          conversationId,
          agentId,
        });
      }

      // Load conversation history from database
      const dbMessages =
        await storage.getMessagesByConversationId(conversationId);
      const history = dbMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Save user message to database
      await storage.createMessage({
        conversationId,
        role: "user",
        content: message,
      });

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
      });

      // Get cached property knowledge base
      const propertyContext = await getPropertyKnowledgeBase();

      // Define system persona with property knowledge
      const systemPersona = `You are the Charney Sales Assistant, an expert AI strategist for luxury condo sales optimized for compliance and agent efficiency.

PRIORITY WORKFLOW - Next Best Action (NBA):
1. When asked about a lead or prospect, FIRST check if they have a recently completed "Showing Session" (visit) without a logged "Post-Showing Follow-up" task.
2. If a showing is complete but follow-up is MISSING, your ONLY response should be: "⚠️ COMPLIANCE ALERT: This lead has a completed showing session without follow-up. Please run the 'End Showing' automation immediately to create the required follow-up email and task."
3. If no showing is incomplete or follow-up already exists, proceed with standard sales advice.

CORE CAPABILITIES:
- Property details and unit specifications
- Objection handling and closing techniques  
- Buyer qualification and matching strategies
- Market intelligence and competitive positioning

You have access to real-time property data and can reference specific units, prices, and availability.
When discussing properties, use actual data from the inventory below.

${propertyContext}

Provide concise, actionable advice that agents can use immediately in sales conversations.
Be professional, confident, and focused on closing deals while maintaining compliance.`;

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
        content: answer,
      });

      // Update conversation timestamp
      await storage.touchConversation(conversationId);

      res.json({
        message: answer,
        conversationId,
      });
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

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
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "WebSocket connected successfully",
        }),
      );
    }
  });

  function broadcastUnitUpdate(unit: any) {
    const message = JSON.stringify({ type: "unit_update", data: unit });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function broadcastLeadUpdate(
    lead: any,
    action: "created" | "updated" | "deleted",
  ) {
    const message = JSON.stringify({ type: "lead_update", action, data: lead });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  (global as any).broadcastUnitUpdate = broadcastUnitUpdate;
  (global as any).broadcastLeadUpdate = broadcastLeadUpdate;

  return httpServer;
}
