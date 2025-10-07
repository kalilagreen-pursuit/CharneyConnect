import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, numeric, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Unit Status enum - maps to existing status values
export const unitStatuses = ["available", "on_hold", "contract", "sold"] as const;
export type UnitStatus = typeof unitStatuses[number];

// Projects table (existing)
export const projects = pgTable("Projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  status: text("status"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;

// FloorPlans table (existing)
export const floorPlans = pgTable("FloorPlans", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  planName: text("plan_name").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: numeric("bathrooms").notNull(),
  sqFt: integer("sq_ft").notNull(),
  imgUrl: text("img_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FloorPlan = typeof floorPlans.$inferSelect;

// Units table (existing)
export const units = pgTable("Units", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  floorPlanId: uuid("floor_plan_id").notNull(),
  unitNumber: text("unit_number").notNull(),
  price: numeric("price").notNull(),
  floor: integer("floor").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Unit = typeof units.$inferSelect;

// Extended Unit type with joined data for CRM display
export type UnitWithDetails = Unit & {
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  building: string;
  floorPlan?: FloorPlan;
  project?: Project;
};

// Contacts table (existing)
export const contacts = pgTable("Contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  contactType: text("contact_type").notNull(),
  consentGivenAt: timestamp("consent_given_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;

// Deals table (existing - maps to "Leads" concept in CRM)
export const deals = pgTable("Deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  unitId: uuid("unit_id").notNull(),
  buyerContactId: uuid("buyer_contact_id"), // Made nullable to support lead-based deals
  leadId: uuid("lead_id"), // Link to leads table for new workflow
  brokerContactId: uuid("broker_contact_id"),
  agentId: text("agent_id").notNull(),
  dealStage: text("deal_stage").notNull(),
  salePrice: numeric("sale_price"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Deal = typeof deals.$inferSelect;

// Activities table (existing)
export const activities = pgTable("Activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull(),
  activityType: text("activity_type").notNull(),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Activity = typeof activities.$inferSelect;

// Extended types for CRM frontend (Deal-based, legacy)
export type DealLead = Deal & {
  contact: Contact;
  broker?: Contact;
  unit?: UnitWithDetails;
  activities: Activity[];
  status: string; // maps from dealStage
  score: number; // derived from deal data
  notes?: string;
};

export type LeadWithDetails = DealLead;

// Active Deal type for agent pipeline view (combines Deal, Lead, and Unit data)
export type ActiveDeal = Deal & {
  lead?: Lead;
  unit?: UnitWithDetails;
};

export type UnitUpdateRequest = {
  status?: string;
  price?: number;
};

// Insert schemas
export const insertUnitSchema = createInsertSchema(units).omit({ id: true, createdAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;

export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true });

// Pipeline stages for lead qualification
export const pipelineStages = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
export type PipelineStage = typeof pipelineStages[number];

// Leads table (public.leads) - CRM lead management with qualification
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  status: text("status").notNull(),
  value: integer("value"),
  phone: text("phone"),
  address: text("address"),
  targetPriceMin: numeric("target_price_min"),
  targetPriceMax: numeric("target_price_max"),
  targetLocations: text("target_locations").array(),
  timeFrameToBuy: text("time_frame_to_buy"),
  leadScore: integer("lead_score").notNull().default(0),
  pipelineStage: text("pipeline_stage").notNull().default('new'),
  agentId: text("agent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  company: z.string().optional(),
  value: z.number().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  targetPriceMin: z.string().optional(),
  targetPriceMax: z.string().optional(),
  targetLocations: z.array(z.string()).optional(),
  timeFrameToBuy: z.string().optional(),
  leadScore: z.number().optional(),
  pipelineStage: z.string().optional(),
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Task priorities and statuses
export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = typeof taskPriorities[number];

export const taskStatuses = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = typeof taskStatuses[number];

// Tasks table for agent task management
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  agentId: text("agent_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default('medium'),
  status: text("status").notNull().default('pending'),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  automationSource: text("automation_source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  description: z.string().optional(),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  automationSource: z.string().optional(),
});
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Engagement event types
export const engagementEventTypes = ["email_open", "email_click", "website_visit", "document_view", "form_submit", "phone_call", "meeting_scheduled", "meeting_attended"] as const;
export type EngagementEventType = typeof engagementEventTypes[number];

// Lead Engagement table for tracking interactions and scoring
export const leadEngagement = pgTable("lead_engagement", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  eventType: text("event_type").notNull(),
  eventMetadata: text("event_metadata"),
  scoreImpact: integer("score_impact").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LeadEngagement = typeof leadEngagement.$inferSelect;
export const insertLeadEngagementSchema = createInsertSchema(leadEngagement).omit({ id: true, createdAt: true }).extend({
  eventMetadata: z.string().optional(),
});
export type InsertLeadEngagement = z.infer<typeof insertLeadEngagementSchema>;

// Extended types for frontend display
export type TaskWithLead = Task & {
  lead: Lead;
};

export type LeadWithEngagement = Lead & {
  engagementEvents: LeadEngagement[];
  tasks: Task[];
  engagementScore: number;
  lastEngagement?: Date;
};
