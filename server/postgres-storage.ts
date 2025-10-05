import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { 
  units, floorPlans, projects, contacts, deals, activities, leads,
  type Unit, type UnitWithDetails, type UnitStatus,
  type Contact, type InsertContact,
  type Deal, type InsertDeal, type DealLead,
  type Activity, type InsertActivity,
  type Lead, type InsertLead, type LeadWithDetails
} from "@shared/schema";
import type { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  
  // Units - join with FloorPlans and Projects to get full data
  async getAllUnits(): Promise<UnitWithDetails[]> {
    const result = await db
      .select({
        unit: units,
        floorPlan: floorPlans,
        project: projects,
      })
      .from(units)
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id));

    return result.map(row => this.mapToUnitWithDetails(row));
  }

  async getUnitById(id: string): Promise<UnitWithDetails | undefined> {
    const result = await db
      .select({
        unit: units,
        floorPlan: floorPlans,
        project: projects,
      })
      .from(units)
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id))
      .where(eq(units.id, id))
      .limit(1);

    if (result.length === 0) return undefined;
    return this.mapToUnitWithDetails(result[0]);
  }

  async getUnitsByAgentId(agentId: string, projectId?: string): Promise<UnitWithDetails[]> {
    const whereConditions = projectId
      ? and(eq(deals.agentId, agentId), eq(units.projectId, projectId))
      : eq(deals.agentId, agentId);

    const result = await db
      .select({
        unit: units,
        floorPlan: floorPlans,
        project: projects,
      })
      .from(deals)
      .innerJoin(units, eq(deals.unitId, units.id))
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id))
      .where(whereConditions);

    return result.map(row => this.mapToUnitWithDetails(row));
  }

  async createUnit(insertUnit: any): Promise<UnitWithDetails> {
    // This would require creating a unit with projectId and floorPlanId
    // Not implemented as we're using existing data
    throw new Error("Creating units not implemented - using existing data");
  }

  async updateUnitStatus(id: string, status: UnitStatus): Promise<UnitWithDetails | undefined> {
    // Map CRM status back to Supabase status values
    const reverseStatusMap: Record<string, string> = {
      'available': 'Available',
      'on_hold': 'Held',
      'sold': 'Sold',
      'contract': 'Contract',
    };
    
    const supabaseStatus = reverseStatusMap[status] || 'Available';
    await db.update(units).set({ status: supabaseStatus }).where(eq(units.id, id));
    return this.getUnitById(id);
  }

  async updateUnitPrice(id: string, price: number): Promise<UnitWithDetails | undefined> {
    await db.update(units).set({ price: price.toString() }).where(eq(units.id, id));
    return this.getUnitById(id);
  }

  // Contacts
  async getAllContacts(): Promise<Contact[]> {
    return db.select().from(contacts);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
    return result[0];
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const result = await db.insert(contacts).values(insertContact).returning();
    return result[0];
  }

  // Brokers (using contacts table with contactType = 'broker')
  async getAllBrokers(): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.contactType, 'broker'));
  }

  async getBrokerById(id: string): Promise<Contact | undefined> {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    return result[0];
  }

  async createBroker(insertBroker: any): Promise<Contact> {
    // Create as contact with type 'broker'
    const result = await db.insert(contacts).values({
      ...insertBroker,
      contactType: 'broker'
    }).returning();
    return result[0];
  }

  // Leads (from public.leads table)
  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads);
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return result[0];
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(insertLead).returning();
    return result[0];
  }

  async updateLead(id: string, updateData: Partial<InsertLead>): Promise<Lead | undefined> {
    const result = await db.update(leads).set(updateData).where(eq(leads.id, id)).returning();
    return result[0];
  }

  // Deal-based leads (legacy)
  async getAllDealLeads(): Promise<LeadWithDetails[]> {
    const result = await db
      .select({
        deal: deals,
        contact: contacts,
        unit: units,
        floorPlan: floorPlans,
        project: projects,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.buyerContactId, contacts.id))
      .leftJoin(units, eq(deals.unitId, units.id))
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id));

    const leadsWithActivities = await Promise.all(
      result.map(async (row) => {
        const activities = await this.getActivitiesByLeadId(row.deal.id);
        return this.mapToDealLead(row, activities);
      })
    );

    return leadsWithActivities;
  }

  async getDealLeadById(id: string): Promise<LeadWithDetails | undefined> {
    const result = await db
      .select({
        deal: deals,
        contact: contacts,
        unit: units,
        floorPlan: floorPlans,
        project: projects,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.buyerContactId, contacts.id))
      .leftJoin(units, eq(deals.unitId, units.id))
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id))
      .where(eq(deals.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const activities = await this.getActivitiesByLeadId(id);
    return this.mapToDealLead(result[0], activities);
  }

  async createDealLead(insertLead: InsertDeal): Promise<DealLead> {
    const result = await db.insert(deals).values(insertLead).returning();
    const deal = result[0];
    
    // Return basic lead structure
    const contact = await this.getContactById(deal.buyerContactId);
    return {
      ...deal,
      contact: contact!,
      activities: [],
      status: deal.dealStage,
      score: 0,
    };
  }

  // Activities
  async getActivitiesByLeadId(leadId: string): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.dealId, leadId));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(insertActivity).returning();
    return result[0];
  }

  // Helper methods
  private mapToUnitWithDetails(row: any): UnitWithDetails {
    const unit = row.unit;
    const floorPlan = row.floorPlan;
    const project = row.project;

    // Map Supabase status values to CRM status values
    const statusMap: Record<string, string> = {
      'Available': 'available',
      'Held': 'on_hold',
      'Sold': 'sold',
      'Contract': 'contract',
      // Add lowercase variants just in case
      'available': 'available',
      'held': 'on_hold',
      'sold': 'sold',
      'contract': 'contract',
    };

    const mappedStatus = statusMap[unit.status] || 'available';

    return {
      ...unit,
      status: mappedStatus,
      bedrooms: floorPlan?.bedrooms ?? 0,
      bathrooms: parseFloat(floorPlan?.bathrooms?.toString() ?? "0"),
      squareFeet: floorPlan?.sqFt ?? 0,
      building: project?.name ?? "Unknown",
      floorPlan,
      project,
    };
  }

  private async mapToDealLead(row: any, activities: Activity[]): Promise<LeadWithDetails> {
    const deal = row.deal;
    const contact = row.contact;
    const unit = row.unit;
    const floorPlan = row.floorPlan;
    const project = row.project;

    let broker: Contact | undefined;
    if (deal.brokerContactId) {
      broker = await this.getBrokerById(deal.brokerContactId);
    }

    let unitWithDetails: UnitWithDetails | undefined;
    if (unit) {
      unitWithDetails = {
        ...unit,
        bedrooms: floorPlan?.bedrooms ?? 0,
        bathrooms: parseFloat(floorPlan?.bathrooms?.toString() ?? "0"),
        squareFeet: floorPlan?.sqFt ?? 0,
        building: project?.name ?? "Unknown",
        floorPlan,
        project,
      };
    }

    return {
      ...deal,
      contact,
      broker,
      unit: unitWithDetails,
      activities,
      status: deal.dealStage,
      score: this.calculateLeadScore(deal, activities),
      notes: deal.category ?? undefined,
    };
  }

  private calculateLeadScore(deal: Deal, activities: Activity[]): number {
    // Simple scoring based on deal stage and activity count
    const stageScores: Record<string, number> = {
      'new': 25,
      'contacted': 40,
      'qualified': 60,
      'negotiating': 80,
      'closed': 100,
      'lost': 0,
    };
    
    const baseScore = stageScores[deal.dealStage] ?? 50;
    const activityBonus = Math.min(activities.length * 5, 25);
    
    return Math.min(baseScore + activityBonus, 100);
  }
  
  // Projects
  async getProjectCounts() {
    const projectsData = await db.select().from(projects);
    const unitsData = await this.getAllUnits();
    
    return projectsData.map(project => {
      const projectUnits = unitsData.filter(u => u.projectId === project.id);
      return {
        id: project.id,
        name: project.name,
        address: project.address || `${project.name} Address`,
        totalUnits: projectUnits.length,
        available: projectUnits.filter(u => u.status === 'available').length,
        reserved: projectUnits.filter(u => u.status === 'on_hold' || u.status === 'contract').length,
        sold: projectUnits.filter(u => u.status === 'sold').length,
      };
    });
  }
}
