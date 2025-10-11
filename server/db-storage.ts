import { db } from './db';
import { units, contacts, brokers, leads, activities, visits, viewedUnits } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { IStorage } from './storage';
import type { 
  Unit, InsertUnit, UnitStatus,
  Contact, InsertContact,
  Broker, InsertBroker,
  Lead, InsertLead, LeadWithDetails,
  Activity, InsertActivity,
  Visit, ViewedUnitSummary
} from '@shared/schema';

export class DbStorage implements IStorage {
  // Units
  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(units);
  }

  async getUnitById(id: string): Promise<Unit | undefined> {
    const result = await db.select().from(units).where(eq(units.id, id));
    return result[0];
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const result = await db.insert(units).values(unit).returning();
    return result[0];
  }

  async updateUnitStatus(id: string, status: UnitStatus): Promise<Unit | undefined> {
    const result = await db
      .update(units)
      .set({ status })
      .where(eq(units.id, id))
      .returning();
    return result[0];
  }

  async updateUnitPrice(id: string, price: number): Promise<Unit | undefined> {
    const result = await db
      .update(units)
      .set({ price })
      .where(eq(units.id, id))
      .returning();
    return result[0];
  }

  // Contacts
  async getAllContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id));
    return result[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const result = await db.insert(contacts).values(contact).returning();
    return result[0];
  }

  // Brokers
  async getAllBrokers(): Promise<Broker[]> {
    return await db.select().from(brokers);
  }

  async getBrokerById(id: string): Promise<Broker | undefined> {
    const result = await db.select().from(brokers).where(eq(brokers.id, id));
    return result[0];
  }

  async createBroker(broker: InsertBroker): Promise<Broker> {
    const result = await db.insert(brokers).values(broker).returning();
    return result[0];
  }

  // Leads
  async getAllLeads(): Promise<LeadWithDetails[]> {
    const allLeads = await db.select().from(leads);
    return Promise.all(allLeads.map(lead => this.enrichLead(lead)));
  }

  async getLeadById(id: string): Promise<LeadWithDetails | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id));
    const lead = result[0];
    if (!lead) return undefined;
    return this.enrichLead(lead);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(lead).returning();
    return result[0];
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

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(activity).returning();
    return result[0];
  }

  // Visits
  async getVisitSummary(visitId: string): Promise<ViewedUnitSummary[]> {
    const result = await db
      .select({
        unitId: viewedUnits.unitId,
        unitNumber: units.unitNumber,
        timestamp: viewedUnits.timestamp,
      })
      .from(viewedUnits)
      .innerJoin(units, eq(viewedUnits.unitId, units.id))
      .where(eq(viewedUnits.visitId, visitId))
      .orderBy(viewedUnits.timestamp);

    return result;
  }

  async getVisitById(visitId: string): Promise<Visit | null> {
    const result = await db
      .select()
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);

    return result[0] || null;
  }
}