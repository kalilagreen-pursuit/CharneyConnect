import { 
  type Unit, type InsertUnit, type UnitStatus, type UnitUpdateRequest,
  type Contact, type InsertContact,
  type Broker, type InsertBroker,
  type Lead, type InsertLead, type LeadWithDetails,
  type Activity, type InsertActivity
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private units: Map<string, Unit>;
  private contacts: Map<string, Contact>;
  private brokers: Map<string, Broker>;
  private leads: Map<string, Lead>;
  private activities: Map<string, Activity>;

  constructor() {
    this.units = new Map();
    this.contacts = new Map();
    this.brokers = new Map();
    this.leads = new Map();
    this.activities = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed Units
    const unitsData: InsertUnit[] = [
      { unitNumber: "101", floor: 1, bedrooms: 1, bathrooms: 1, squareFeet: 650, price: 425000, status: "available", building: "Tower A" },
      { unitNumber: "102", floor: 1, bedrooms: 1, bathrooms: 1, squareFeet: 680, price: 445000, status: "available", building: "Tower A" },
      { unitNumber: "201", floor: 2, bedrooms: 2, bathrooms: 2, squareFeet: 950, price: 625000, status: "on_hold", building: "Tower A" },
      { unitNumber: "202", floor: 2, bedrooms: 2, bathrooms: 2, squareFeet: 980, price: 645000, status: "contract", building: "Tower A" },
      { unitNumber: "301", floor: 3, bedrooms: 2, bathrooms: 2, squareFeet: 1050, price: 695000, status: "available", building: "Tower A" },
      { unitNumber: "302", floor: 3, bedrooms: 2, bathrooms: 2, squareFeet: 1080, price: 715000, status: "sold", building: "Tower A" },
      { unitNumber: "401", floor: 4, bedrooms: 3, bathrooms: 2.5, squareFeet: 1450, price: 895000, status: "available", building: "Tower B" },
      { unitNumber: "402", floor: 4, bedrooms: 3, bathrooms: 2.5, squareFeet: 1480, price: 915000, status: "on_hold", building: "Tower B" },
      { unitNumber: "501", floor: 5, bedrooms: 3, bathrooms: 3, squareFeet: 1650, price: 1025000, status: "contract", building: "Tower B" },
      { unitNumber: "502", floor: 5, bedrooms: 3, bathrooms: 3, squareFeet: 1680, price: 1045000, status: "available", building: "Tower B" },
      { unitNumber: "601", floor: 6, bedrooms: 3, bathrooms: 3, squareFeet: 1750, price: 1125000, status: "sold", building: "Tower B" },
      { unitNumber: "PH1", floor: 7, bedrooms: 4, bathrooms: 4, squareFeet: 2500, price: 1750000, status: "available", building: "Tower B" },
    ];

    unitsData.forEach(unit => {
      const id = randomUUID();
      this.units.set(id, { ...unit, id } as Unit);
    });

    // Seed Contacts
    const contactsData: InsertContact[] = [
      { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@email.com", phone: "(555) 123-4567", type: "buyer" },
      { firstName: "Michael", lastName: "Rodriguez", email: "m.rodriguez@email.com", phone: "(555) 234-5678", type: "buyer" },
      { firstName: "Emily", lastName: "Thompson", email: "emily.t@email.com", phone: "(555) 345-6789", type: "buyer" },
      { firstName: "David", lastName: "Kim", email: "david.kim@email.com", phone: "(555) 456-7890", type: "buyer" },
      { firstName: "Jessica", lastName: "Martinez", email: "j.martinez@email.com", phone: "(555) 567-8901", type: "buyer" },
    ];

    contactsData.forEach(contact => {
      const id = randomUUID();
      this.contacts.set(id, { ...contact, id });
    });

    // Seed Brokers
    const brokersData: InsertBroker[] = [
      { firstName: "Robert", lastName: "Williams", email: "r.williams@realty.com", phone: "(555) 111-2222", company: "Premium Realty Group", license: "BR123456" },
      { firstName: "Amanda", lastName: "Johnson", email: "a.johnson@realty.com", phone: "(555) 222-3333", company: "Luxury Properties Inc", license: "BR234567" },
      { firstName: "James", lastName: "Brown", email: "j.brown@realty.com", phone: "(555) 333-4444", company: "Elite Real Estate", license: "BR345678" },
    ];

    brokersData.forEach(broker => {
      const id = randomUUID();
      this.brokers.set(id, { ...broker, id });
    });

    // Seed Leads
    const contactIds = Array.from(this.contacts.keys());
    const brokerIds = Array.from(this.brokers.keys());
    const unitIds = Array.from(this.units.keys());

    const leadsData: InsertLead[] = [
      { contactId: contactIds[0], brokerId: brokerIds[0], unitId: unitIds[2], status: "qualified", score: 85, notes: "Very interested in 2BR with city view" },
      { contactId: contactIds[1], brokerId: brokerIds[1], unitId: unitIds[3], status: "negotiating", score: 90, notes: "Ready to make an offer" },
      { contactId: contactIds[2], brokerId: brokerIds[0], unitId: unitIds[7], status: "contacted", score: 65, notes: "First-time buyer, needs financing info" },
      { contactId: contactIds[3], brokerId: brokerIds[2], unitId: unitIds[11], status: "qualified", score: 95, notes: "Looking for penthouse, cash buyer" },
      { contactId: contactIds[4], brokerId: brokerIds[1], unitId: unitIds[4], status: "new", score: 50, notes: "Requested virtual tour" },
    ];

    leadsData.forEach(lead => {
      const id = randomUUID();
      const leadWithDefaults: Lead = { 
        ...lead, 
        id, 
        createdAt: new Date(),
        brokerId: lead.brokerId ?? null,
        unitId: lead.unitId ?? null,
        score: lead.score ?? 0,
        notes: lead.notes ?? null
      };
      this.leads.set(id, leadWithDefaults);
    });

    // Seed Activities
    const leadIds = Array.from(this.leads.keys());
    const activitiesData: InsertActivity[] = [
      { leadId: leadIds[0], type: "call", description: "Initial phone consultation - discussed budget and preferences" },
      { leadId: leadIds[0], type: "email", description: "Sent property brochure and floor plans" },
      { leadId: leadIds[0], type: "viewing", description: "Scheduled in-person viewing for this weekend" },
      { leadId: leadIds[1], type: "meeting", description: "Met at property - very positive feedback" },
      { leadId: leadIds[1], type: "note", description: "Client is preparing offer documentation" },
      { leadId: leadIds[2], type: "call", description: "Discussed financing options with mortgage specialist" },
      { leadId: leadIds[3], type: "viewing", description: "Private penthouse showing conducted" },
      { leadId: leadIds[3], type: "note", description: "Client impressed with views and amenities" },
    ];

    activitiesData.forEach(activity => {
      const id = randomUUID();
      this.activities.set(id, { ...activity, id, createdAt: new Date() });
    });
  }

  // Units
  async getAllUnits(): Promise<Unit[]> {
    return Array.from(this.units.values());
  }

  async getUnitById(id: string): Promise<Unit | undefined> {
    return this.units.get(id);
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const id = randomUUID();
    const unit: Unit = { ...insertUnit, id } as Unit;
    this.units.set(id, unit);
    return unit;
  }

  async updateUnitStatus(id: string, status: UnitStatus): Promise<Unit | undefined> {
    const unit = this.units.get(id);
    if (!unit) return undefined;
    
    const updatedUnit = { ...unit, status };
    this.units.set(id, updatedUnit);
    return updatedUnit;
  }

  async updateUnitPrice(id: string, price: number): Promise<Unit | undefined> {
    const unit = this.units.get(id);
    if (!unit) return undefined;
    
    const updatedUnit = { ...unit, price };
    this.units.set(id, updatedUnit);
    return updatedUnit;
  }

  // Contacts
  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = { ...insertContact, id };
    this.contacts.set(id, contact);
    return contact;
  }

  // Brokers
  async getAllBrokers(): Promise<Broker[]> {
    return Array.from(this.brokers.values());
  }

  async getBrokerById(id: string): Promise<Broker | undefined> {
    return this.brokers.get(id);
  }

  async createBroker(insertBroker: InsertBroker): Promise<Broker> {
    const id = randomUUID();
    const broker: Broker = { ...insertBroker, id };
    this.brokers.set(id, broker);
    return broker;
  }

  // Leads
  async getAllLeads(): Promise<LeadWithDetails[]> {
    const leads = Array.from(this.leads.values());
    return Promise.all(leads.map(lead => this.enrichLead(lead)));
  }

  async getLeadById(id: string): Promise<LeadWithDetails | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    return this.enrichLead(lead);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const lead: Lead = { 
      ...insertLead, 
      id, 
      createdAt: new Date(),
      brokerId: insertLead.brokerId ?? null,
      unitId: insertLead.unitId ?? null,
      score: insertLead.score ?? 0,
      notes: insertLead.notes ?? null
    };
    this.leads.set(id, lead);
    return lead;
  }

  private async enrichLead(lead: Lead): Promise<LeadWithDetails> {
    const contact = await this.getContactById(lead.contactId);
    const broker = lead.brokerId ? await this.getBrokerById(lead.brokerId) : undefined;
    const unit = lead.unitId ? await this.getUnitById(lead.unitId) : undefined;
    const activities = await this.getActivitiesByLeadId(lead.id);

    if (!contact) {
      throw new Error(`Contact not found for lead ${lead.id}`);
    }

    return {
      ...lead,
      contact,
      broker,
      unit,
      activities,
    };
  }

  // Activities
  async getActivitiesByLeadId(leadId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      activity => activity.leadId === leadId
    );
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { ...insertActivity, id, createdAt: new Date() };
    this.activities.set(id, activity);
    return activity;
  }
}

import { DbStorage } from './db-storage';

// Use DbStorage for production, MemStorage for development/testing
export const storage = process.env.DATABASE_URL ? new DbStorage() : new MemStorage();
