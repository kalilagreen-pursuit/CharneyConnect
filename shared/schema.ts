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
  buyerContactId: uuid("buyer_contact_id").notNull(),
  brokerContactId: uuid("broker_contact_id"),
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

// Leads table (public.leads) - CRM lead management
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  status: text("status").notNull(),
  value: integer("value"),
  phone: text("phone"),
  address: text("address"),
});

export type Lead = typeof leads.$inferSelect;
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true }).extend({
  company: z.string().optional(),
  value: z.number().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
