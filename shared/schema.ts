import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Unit Status enum
export const unitStatuses = ["available", "on_hold", "contract", "sold"] as const;
export type UnitStatus = typeof unitStatuses[number];

// CRM Units table (separate from existing Units table)
export const units = pgTable("crm_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unitNumber: text("unit_number").notNull(),
  floor: integer("floor").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  squareFeet: integer("square_feet").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().$type<UnitStatus>(),
  building: text("building").notNull(),
});

export const insertUnitSchema = createInsertSchema(units).omit({ id: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;

// CRM Contacts table (separate from existing Contacts table)
export const contacts = pgTable("crm_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  type: text("type").notNull(), // 'buyer' | 'seller'
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// CRM Brokers table
export const brokers = pgTable("crm_brokers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  company: text("company").notNull(),
  license: text("license").notNull(),
});

export const insertBrokerSchema = createInsertSchema(brokers).omit({ id: true });
export type InsertBroker = z.infer<typeof insertBrokerSchema>;
export type Broker = typeof brokers.$inferSelect;

// CRM Leads table
export const leads = pgTable("crm_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull(),
  brokerId: varchar("broker_id"),
  unitId: varchar("unit_id"),
  status: text("status").notNull(), // 'new' | 'contacted' | 'qualified' | 'negotiating' | 'closed' | 'lost'
  score: integer("score").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// CRM Activities table
export const activities = pgTable("crm_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  type: text("type").notNull(), // 'call' | 'email' | 'meeting' | 'viewing' | 'note'
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Extended types for frontend use
export type LeadWithDetails = Lead & {
  contact: Contact;
  broker?: Broker;
  unit?: Unit;
  activities: Activity[];
};

export type UnitUpdateRequest = {
  status?: UnitStatus;
  price?: number;
};
