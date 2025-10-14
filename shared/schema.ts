import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  numeric,
  uuid,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Unit Status enum - maps to existing status values
export const unitStatuses = [
  "available",
  "on_hold",
  "contract",
  "sold",
] as const;
export type UnitStatus = (typeof unitStatuses)[number];

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

// Agents table
export const agents = pgTable("agents", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Agent = typeof agents.$inferSelect;
export const insertAgentSchema = createInsertSchema(agents).omit({
  createdAt: true,
});
export type InsertAgent = z.infer<typeof insertAgentSchema>;

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
  buyerContactId: uuid("buyer_contact_id").notNull(),
  brokerContactId: uuid("broker_contact_id"),
  agentId: text("agent_id").notNull(),
  dealStage: text("deal_stage").notNull(),
  salePrice: numeric("sale_price"),
  category: text("category"),
  leadId: uuid("lead_id"), // Link to leads table
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Deal = typeof deals.$inferSelect;

// Activities table (existing - note: table name is capitalized in database)
export const activities = pgTable("Activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull(),
  activityType: text("activity_type").notNull(),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Activity = typeof activities.$inferSelect;

// NEW: Table to track a "Showing Session" or a Visit
export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  agentId: text("agent_id").notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export type Visit = typeof visits.$inferSelect;

// NEW: Join table to log each unit viewed during a specific visit
export const viewedUnits = pgTable("viewed_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id),
  unitId: uuid("unit_id")
    .notNull()
    .references(() => units.id),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow(),
});

export type ViewedUnit = typeof viewedUnits.$inferSelect;

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

export type UnitUpdateRequest = {
  status?: string;
  price?: number;
};

// Unit with Deal context for Agent Active Deals view
export type UnitWithDealContext = UnitWithDetails & {
  dealId: string;
  dealStage: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  brokerName?: string;
  brokerEmail?: string;
  leadScore?: number;
  hasOverdueTasks: boolean;
  isHotLead: boolean;
  isStaleLead: boolean;
};

// Insert schemas
export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
});
export type InsertUnit = z.infer<typeof insertUnitSchema>;

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});
export type InsertContact = z.infer<typeof insertContactSchema>;

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
});

// Pipeline stages for lead qualification
export const pipelineStages = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;
export type PipelineStage = (typeof pipelineStages)[number];

// Leads table (public.leads) - CRM lead management with qualification
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  address: text("address"),
  value: decimal("value", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  targetPriceMin: varchar("target_price_min", { length: 50 }),
  targetPriceMax: varchar("target_price_max", { length: 50 }),
  targetLocations: text("target_locations").array(),
  timeFrameToBuy: varchar("time_frame_to_buy", { length: 50 }),
  leadScore: integer("lead_score").default(0),
  pipelineStage: varchar("pipeline_stage", { length: 50 }).default("new"),
  agentId: varchar("agent_id", { length: 50 }),
  preferenceScore: integer("preference_score").default(0),
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect & {
  toured_unit_ids?: string[]; // Array of Unit IDs checked off by the agent
  firstName?: string;
  lastName?: string;
  preferences?: {
    min_price?: number;
    max_price?: number;
    min_beds?: number;
    max_beds?: number;
    min_baths?: number;
    max_baths?: number;
    min_sqft?: number;
    max_sqft?: number;
    desired_views?: string[];
    preferred_floors?: string[];
    preferred_buildings?: string[];
  };
};

// Client preferences interface for type safety
export interface ClientPreferences {
  targetPriceMin?: number;
  targetPriceMax?: number;
  targetLocations?: string[];
  targetBedrooms?: number;
  targetBathrooms?: number;
  targetSqftMin?: number;
  targetSqftMax?: number;
  desiredViews?: string[];
  timeFrameToBuy?: string;
}

export const insertLeadSchema = createInsertSchema(leads)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    company: z.string().optional(),
    value: z.number().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    targetPriceMin: z.string().optional(),
    targetPriceMax: z.string().optional(),
    targetLocations: z.array(z.string()).optional(),
    targetBedrooms: z.number().optional(),
    targetBathrooms: z.number().optional(),
    targetSqftMin: z.number().optional(),
    targetSqftMax: z.number().optional(),
    desiredViews: z.array(z.string()).optional(),
    timeFrameToBuy: z.string().optional(),
    leadScore: z.number().optional(),
    pipelineStage: z.string().optional(),
    toured_unit_ids: z.array(z.string()).optional(),
    preferenceScore: z.number().optional(),
    lastContactedAt: z.date().optional(),
    nextFollowUpDate: z.date().optional(),
  });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Task priorities and statuses
export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskStatuses = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

// Tasks table for agent task management
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  agentId: text("agent_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  automationSource: text("automation_source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export const insertTaskSchema = createInsertSchema(tasks)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    description: z.string().optional(),
    dueDate: z.date().optional(),
    completedAt: z.date().optional(),
    automationSource: z.string().optional(),
  });
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Engagement event types
export const engagementEventTypes = [
  "email_open",
  "email_click",
  "website_visit",
  "document_view",
  "form_submit",
  "phone_call",
  "meeting_scheduled",
  "meeting_attended",
] as const;
export type EngagementEventType = (typeof engagementEventTypes)[number];

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
export const insertLeadEngagementSchema = createInsertSchema(leadEngagement)
  .omit({ id: true, createdAt: true })
  .extend({
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

// AI Conversations table - stores conversation metadata
export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: text("conversation_id").notNull().unique(),
  agentId: text("agent_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AiConversation = typeof aiConversations.$inferSelect;
export const insertAiConversationSchema = createInsertSchema(aiConversations)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    title: z.string().optional(),
  });
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;

// AI Messages table - stores individual messages in conversations
export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => aiConversations.conversationId, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AiMessage = typeof aiMessages.$inferSelect;
export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;

// AI Feedback table - stores thumbs up/down feedback
export const aiFeedback = pgTable("ai_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => aiMessages.id, { onDelete: "cascade" }),
  feedbackType: text("feedback_type").notNull(), // 'positive' or 'negative'
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AiFeedback = typeof aiFeedback.$inferSelect;
export const insertAiFeedbackSchema = createInsertSchema(aiFeedback)
  .omit({ id: true, createdAt: true })
  .extend({
    comment: z.string().optional(),
  });
export type InsertAiFeedback = z.infer<typeof insertAiFeedbackSchema>;

// Showing Sessions table - tracks agent-led property showing sessions
export const showingSessions = pgTable("showing_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  projectId: uuid("project_id").notNull(),
  status: text("status").notNull().default("in_progress"), // 'in_progress', 'completed', 'cancelled'
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  totalUnitsViewed: integer("total_units_viewed").default(0),
  duration: integer("duration"), // duration in minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ShowingSession = typeof showingSessions.$inferSelect;
export const insertShowingSessionSchema = createInsertSchema(showingSessions)
  .omit({ id: true, createdAt: true })
  .extend({
    completedAt: z.date().optional(),
    totalUnitsViewed: z.number().optional(),
    duration: z.number().optional(),
  });
export type InsertShowingSession = z.infer<typeof insertShowingSessionSchema>;

// Toured Units table - tracks which units were viewed during showing sessions
export const touredUnits = pgTable("toured_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => showingSessions.id, { onDelete: "cascade" }),
  unitId: uuid("unit_id")
    .notNull()
    .references(() => units.id),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  agentNotes: text("agent_notes"),
  clientInterestLevel: text("client_interest_level"), // 'low', 'medium', 'high', 'very_high'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TouredUnit = typeof touredUnits.$inferSelect;
export const insertTouredUnitSchema = createInsertSchema(touredUnits)
  .omit({ id: true, createdAt: true })
  .extend({
    agentNotes: z.string().optional(),
    clientInterestLevel: z.string().optional(),
  });
export type InsertTouredUnit = z.infer<typeof insertTouredUnitSchema>;

// Portal Links table - personalized buyer portal links with toured units
export const portalLinks = pgTable("portal_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => showingSessions.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull(),
  linkToken: text("link_token").notNull().unique(),
  touredUnitIds: text("toured_unit_ids").array(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PortalLink = typeof portalLinks.$inferSelect;
export const insertPortalLinkSchema = createInsertSchema(portalLinks)
  .omit({ id: true, createdAt: true })
  .extend({
    touredUnitIds: z.array(z.string()).optional(),
    expiresAt: z.date().optional(),
  });
export type InsertPortalLink = z.infer<typeof insertPortalLinkSchema>;
