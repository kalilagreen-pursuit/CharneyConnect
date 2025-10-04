import { 
  type Unit, type InsertUnit, type UnitStatus,
  type Contact, type InsertContact,
  type Broker, type InsertBroker,
  type Lead, type InsertLead, type LeadWithDetails,
  type Activity, type InsertActivity,
  units, contacts, brokers, leads, activities
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Units
  getAllUnits(): Promise<Unit[]>;
  getUnitById(id: string): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnitStatus(id: string, status: UnitStatus): Promise<Unit | undefined>;
  updateUnitPrice(id: string, price: number): Promise<Unit | undefined>;
  
  // Contacts
  getAllContacts(): Promise<Contact[]>;
  getContactById(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Brokers
  getAllBrokers(): Promise<Broker[]>;
  getBrokerById(id: string): Promise<Broker | undefined>;
  createBroker(broker: InsertBroker): Promise<Broker>;
  
  // Leads
  getAllLeads(): Promise<LeadWithDetails[]>;
  getLeadById(id: string): Promise<LeadWithDetails | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  
  // Activities
  getActivitiesByLeadId(leadId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Seed
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Units
  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(units);
  }

  async getUnitById(id: string): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit || undefined;
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const [unit] = await db.insert(units).values(insertUnit).returning();
    return unit;
  }

  async updateUnitStatus(id: string, status: UnitStatus): Promise<Unit | undefined> {
    const [updatedUnit] = await db
      .update(units)
      .set({ status })
      .where(eq(units.id, id))
      .returning();
    return updatedUnit || undefined;
  }

  async updateUnitPrice(id: string, price: number): Promise<Unit | undefined> {
    const [updatedUnit] = await db
      .update(units)
      .set({ price })
      .where(eq(units.id, id))
      .returning();
    return updatedUnit || undefined;
  }

  // Contacts
  async getAllContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(insertContact).returning();
    return contact;
  }

  // Brokers
  async getAllBrokers(): Promise<Broker[]> {
    return await db.select().from(brokers);
  }

  async getBrokerById(id: string): Promise<Broker | undefined> {
    const [broker] = await db.select().from(brokers).where(eq(brokers.id, id));
    return broker || undefined;
  }

  async createBroker(insertBroker: InsertBroker): Promise<Broker> {
    const [broker] = await db.insert(brokers).values(insertBroker).returning();
    return broker;
  }

  // Leads
  async getAllLeads(): Promise<LeadWithDetails[]> {
    const allLeads = await db.select().from(leads);
    return await Promise.all(allLeads.map(lead => this.enrichLead(lead)));
  }

  async getLeadById(id: string): Promise<LeadWithDetails | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) return undefined;
    return await this.enrichLead(lead);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  private async enrichLead(lead: Lead): Promise<LeadWithDetails> {
    const contact = await this.getContactById(lead.contactId);
    const broker = lead.brokerId ? await this.getBrokerById(lead.brokerId) : undefined;
    const unit = lead.unitId ? await this.getUnitById(lead.unitId) : undefined;
    const leadActivities = await this.getActivitiesByLeadId(lead.id);

    if (!contact) {
      throw new Error(`Contact not found for lead ${lead.id}`);
    }

    return {
      ...lead,
      contact,
      broker,
      unit,
      activities: leadActivities,
    };
  }

  // Activities
  async getActivitiesByLeadId(leadId: string): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.leadId, leadId));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Seed data
  async seedData(): Promise<void> {
    // Check if data already exists
    const existingUnits = await this.getAllUnits();
    if (existingUnits.length > 0) {
      console.log('Database already seeded, skipping seed data');
      return;
    }

    console.log('Seeding database with initial data...');

    // Seed Units
    const unitsData: InsertUnit[] = [
      { unitNumber: "101", floor: 1, bedrooms: 1, bathrooms: 1, squareFeet: 650, price: 425000, status: "available", building: "Tower A" },
      { unitNumber: "102", floor: 1, bedrooms: 1, bathrooms: 1, squareFeet: 680, price: 445000, status: "available", building: "Tower A" },
      { unitNumber: "201", floor: 2, bedrooms: 2, bathrooms: 2, squareFeet: 950, price: 625000, status: "on_hold", building: "Tower A" },
      { unitNumber: "202", floor: 2, bedrooms: 2, bathrooms: 2, squareFeet: 980, price: 645000, status: "contract", building: "Tower A" },
      { unitNumber: "301", floor: 3, bedrooms: 2, bathrooms: 2, squareFeet: 1050, price: 695000, status: "available", building: "Tower A" },
      { unitNumber: "302", floor: 3, bedrooms: 2, bathrooms: 2, squareFeet: 1080, price: 715000, status: "sold", building: "Tower A" },
      { unitNumber: "401", floor: 4, bedrooms: 3, bathrooms: 3, squareFeet: 1450, price: 895000, status: "available", building: "Tower B" },
      { unitNumber: "402", floor: 4, bedrooms: 3, bathrooms: 3, squareFeet: 1480, price: 915000, status: "on_hold", building: "Tower B" },
      { unitNumber: "501", floor: 5, bedrooms: 3, bathrooms: 3, squareFeet: 1650, price: 1025000, status: "contract", building: "Tower B" },
      { unitNumber: "502", floor: 5, bedrooms: 3, bathrooms: 3, squareFeet: 1680, price: 1045000, status: "available", building: "Tower B" },
      { unitNumber: "601", floor: 6, bedrooms: 3, bathrooms: 3, squareFeet: 1750, price: 1125000, status: "sold", building: "Tower B" },
      { unitNumber: "PH1", floor: 7, bedrooms: 4, bathrooms: 4, squareFeet: 2500, price: 1750000, status: "available", building: "Tower B" },
    ];

    const createdUnits = await Promise.all(
      unitsData.map(unit => this.createUnit(unit))
    );

    // Seed Contacts
    const contactsData: InsertContact[] = [
      { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@email.com", phone: "(555) 123-4567", type: "buyer" },
      { firstName: "Michael", lastName: "Rodriguez", email: "m.rodriguez@email.com", phone: "(555) 234-5678", type: "buyer" },
      { firstName: "Emily", lastName: "Thompson", email: "emily.t@email.com", phone: "(555) 345-6789", type: "buyer" },
      { firstName: "David", lastName: "Kim", email: "david.kim@email.com", phone: "(555) 456-7890", type: "buyer" },
      { firstName: "Jessica", lastName: "Martinez", email: "j.martinez@email.com", phone: "(555) 567-8901", type: "buyer" },
    ];

    const createdContacts = await Promise.all(
      contactsData.map(contact => this.createContact(contact))
    );

    // Seed Brokers
    const brokersData: InsertBroker[] = [
      { firstName: "Robert", lastName: "Williams", email: "r.williams@realty.com", phone: "(555) 111-2222", company: "Premium Realty Group", license: "BR123456" },
      { firstName: "Amanda", lastName: "Johnson", email: "a.johnson@realty.com", phone: "(555) 222-3333", company: "Luxury Properties Inc", license: "BR234567" },
      { firstName: "James", lastName: "Brown", email: "j.brown@realty.com", phone: "(555) 333-4444", company: "Elite Real Estate", license: "BR345678" },
    ];

    const createdBrokers = await Promise.all(
      brokersData.map(broker => this.createBroker(broker))
    );

    // Seed Leads
    const leadsData: InsertLead[] = [
      { contactId: createdContacts[0].id, brokerId: createdBrokers[0].id, unitId: createdUnits[2].id, status: "qualified", score: 85, notes: "Very interested in 2BR with city view" },
      { contactId: createdContacts[1].id, brokerId: createdBrokers[1].id, unitId: createdUnits[3].id, status: "negotiating", score: 90, notes: "Ready to make an offer" },
      { contactId: createdContacts[2].id, brokerId: createdBrokers[0].id, unitId: createdUnits[7].id, status: "contacted", score: 65, notes: "First-time buyer, needs financing info" },
      { contactId: createdContacts[3].id, brokerId: createdBrokers[2].id, unitId: createdUnits[11].id, status: "qualified", score: 95, notes: "Looking for penthouse, cash buyer" },
      { contactId: createdContacts[4].id, brokerId: createdBrokers[1].id, unitId: createdUnits[4].id, status: "new", score: 50, notes: "Requested virtual tour" },
    ];

    const createdLeads = await Promise.all(
      leadsData.map(lead => this.createLead(lead))
    );

    // Seed Activities
    const activitiesData: InsertActivity[] = [
      { leadId: createdLeads[0].id, type: "call", description: "Initial phone consultation - discussed budget and preferences" },
      { leadId: createdLeads[0].id, type: "email", description: "Sent property brochure and floor plans" },
      { leadId: createdLeads[0].id, type: "viewing", description: "Scheduled in-person viewing for this weekend" },
      { leadId: createdLeads[1].id, type: "meeting", description: "Met at property - very positive feedback" },
      { leadId: createdLeads[1].id, type: "note", description: "Client is preparing offer documentation" },
      { leadId: createdLeads[2].id, type: "call", description: "Discussed financing options with mortgage specialist" },
      { leadId: createdLeads[3].id, type: "viewing", description: "Private penthouse showing conducted" },
      { leadId: createdLeads[3].id, type: "note", description: "Client impressed with views and amenities" },
    ];

    await Promise.all(
      activitiesData.map(activity => this.createActivity(activity))
    );

    console.log('Database seeded successfully');
  }
}

export const storage = new DatabaseStorage();
