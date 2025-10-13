import { eq, and, lt, sql, or, ilike } from "drizzle-orm";
import { db } from "./db";
import {
  units,
  floorPlans,
  projects,
  contacts,
  deals,
  activities,
  leads,
  tasks,
  leadEngagement,
  aiConversations,
  aiMessages,
  aiFeedback,
  visits,
  type Visit,
  viewedUnits,
  type ViewedUnit,
  type Unit,
  type UnitWithDetails,
  type UnitStatus,
  type UnitWithDealContext,
  type Contact,
  type InsertContact,
  type Deal,
  type InsertDeal,
  type DealLead,
  type Activity,
  type InsertActivity,
  type Lead,
  type InsertLead,
  type LeadWithDetails,
  type Task,
  type InsertTask,
  type LeadEngagement,
  type InsertLeadEngagement,
  type AiConversation,
  type InsertAiConversation,
  type AiMessage,
  type InsertAiMessage,
  type AiFeedback,
  type InsertAiFeedback,
  agents,
  type Agent,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class PostgresStorage implements IStorage {
  // Agents
  async getAllAgents(): Promise<Agent[]> {
    try {
      console.log("Fetching agents from database...");
      const result = await db.select().from(agents);
      console.log(`Successfully fetched ${result.length} agents from database`);

      if (result.length === 0) {
        console.warn(
          "Database query returned zero agents. Check if agents table has data.",
        );
      }

      return result;
    } catch (error) {
      console.error("Error fetching agents from database:", error);
      throw error;
    }
  }

  async getAgentById(id: string): Promise<Agent | undefined> {
    try {
      const result = await db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .limit(1);

      if (result.length === 0) return undefined;
      return result[0];
    } catch (error) {
      console.error(`Error fetching agent ${id} from database:`, error);
      throw error;
    }
  }

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

    return result.map((row) => this.mapToUnitWithDetails(row));
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

  async getUnitsByAgentId(
    agentId: string,
    projectId?: string,
    showAllProjectUnits?: boolean,
  ): Promise<UnitWithDetails[]> {
    if (showAllProjectUnits && projectId) {
      const result = await db
        .select({
          unit: units,
          floorPlan: floorPlans,
          project: projects,
        })
        .from(units)
        .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
        .leftJoin(projects, eq(units.projectId, projects.id))
        .where(eq(units.projectId, projectId));

      return result.map((row) => this.mapToUnitWithDetails(row));
    }

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

    return result.map((row) => this.mapToUnitWithDetails(row));
  }

  async getActiveDealsByAgentId(
    agentId: string,
    projectId?: string,
  ): Promise<UnitWithDealContext[]> {
    const whereConditions = projectId
      ? and(eq(deals.agentId, agentId), eq(units.projectId, projectId))
      : eq(deals.agentId, agentId);

    const result = await db
      .select({
        unit: units,
        floorPlan: floorPlans,
        project: projects,
        deal: deals,
        buyerContact: contacts,
        lead: leads,
      })
      .from(deals)
      .innerJoin(units, eq(deals.unitId, units.id))
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id))
      .innerJoin(contacts, eq(deals.buyerContactId, contacts.id))
      .leftJoin(leads, eq(contacts.email, leads.email))
      .where(whereConditions);

    const unitsWithContext = await Promise.all(
      result.map(async (row) => {
        const unitWithDetails = this.mapToUnitWithDetails({
          unit: row.unit,
          floorPlan: row.floorPlan,
          project: row.project,
        });

        const leadId = row.lead?.id;
        let hasOverdueTasks = false;
        let isHotLead = false;
        let isStaleLead = false;
        const leadScore = row.lead?.leadScore || 0;

        if (leadId) {
          const now = new Date();
          const sevenDaysAgo = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000,
          );

          const overdueTasks = await db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(
              and(
                eq(tasks.leadId, leadId),
                lt(tasks.dueDate, now),
                eq(tasks.status, "pending"),
              ),
            );

          hasOverdueTasks = Number(overdueTasks[0]?.count || 0) > 0;

          const recentActivity = await db
            .select({ count: sql<number>`count(*)` })
            .from(leadEngagement)
            .where(
              and(
                eq(leadEngagement.leadId, leadId),
                sql`${leadEngagement.createdAt} >= ${sevenDaysAgo}`,
              ),
            );

          isStaleLead = Number(recentActivity[0]?.count || 0) === 0;
          isHotLead = leadScore > 75;
        }

        return {
          ...unitWithDetails,
          dealId: row.deal.id,
          dealStage: row.deal.dealStage,
          leadName: `${row.buyerContact.firstName} ${row.buyerContact.lastName}`,
          leadEmail: row.buyerContact.email,
          leadPhone: row.buyerContact.phone,
          leadScore,
          hasOverdueTasks,
          isHotLead,
          isStaleLead,
        };
      }),
    );

    return unitsWithContext;
  }

  async createUnit(insertUnit: any): Promise<UnitWithDetails> {
    // This would require creating a unit with projectId and floorPlanId
    // Not implemented as we're using existing data
    throw new Error("Creating units not implemented - using existing data");
  }

  async updateUnitStatus(
    id: string,
    status: UnitStatus,
  ): Promise<UnitWithDetails | undefined> {
    // Map CRM status back to Supabase status values
    const reverseStatusMap: Record<string, string> = {
      available: "Available",
      on_hold: "Held",
      sold: "Sold",
      contract: "Contract",
    };

    const supabaseStatus = reverseStatusMap[status] || "Available";
    await db
      .update(units)
      .set({ status: supabaseStatus })
      .where(eq(units.id, id));
    return this.getUnitById(id);
  }

  async updateUnitPrice(
    id: string,
    price: number,
  ): Promise<UnitWithDetails | undefined> {
    await db
      .update(units)
      .set({ price: price.toString() })
      .where(eq(units.id, id));
    return this.getUnitById(id);
  }

  // Contacts
  async getAllContacts(): Promise<Contact[]> {
    return db.select().from(contacts);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    return result[0];
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const result = await db.insert(contacts).values(insertContact).returning();
    return result[0];
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const searchPattern = `%${query}%`;
    return db
      .select()
      .from(contacts)
      .where(
        or(
          ilike(contacts.firstName, searchPattern),
          ilike(contacts.lastName, searchPattern),
          ilike(contacts.email, searchPattern),
          ilike(contacts.phone, searchPattern),
        ),
      );
  }

  // Brokers (using contacts table with contactType = 'broker')
  async getAllBrokers(): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.contactType, "broker"));
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
    const result = await db
      .insert(contacts)
      .values({
        ...insertBroker,
        contactType: "broker",
      })
      .returning();
    return result[0];
  }

  // Leads (from public.leads table)
  async getAllLeads(): Promise<Lead[]> {
    try {
      const result = await db.select().from(leads);
      return result;
    } catch (error) {
      console.error("Error in getAllLeads:", error);
      throw error;
    }
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const result = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);
    return result[0];
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(insertLead).returning();
    return result[0];
  }

  async updateLead(
    id: string,
    updateData: Partial<InsertLead>,
  ): Promise<Lead | undefined> {
    const result = await db
      .update(leads)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
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
      }),
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
    const result = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return result[0];
  }

  // NEW: Add the real implementation for creating a visit
  async createVisit(
    visitData: Pick<Visit, "leadId" | "agentId" | "projectId">,
  ): Promise<Visit> {
    const [newVisit] = await db
      .insert(visits)
      .values({
        leadId: visitData.leadId,
        agentId: visitData.agentId,
        projectId: visitData.projectId,
      })
      .returning();

    if (!newVisit) {
      throw new Error("Failed to create visit record in database.");
    }

    return newVisit;
  }

  // NEW: Add the real implementation for logging a viewed unit
  async logUnitView(visitId: string, unitId: string): Promise<ViewedUnit> {
    const [newView] = await db
      .insert(viewedUnits)
      .values({
        visitId,
        unitId,
      })
      .returning();

    if (!newView) {
      throw new Error("Failed to log unit view in database.");
    }

    return newView;
  }
  // NEW: Get the summary of a visit (all viewed units)
  async getVisitSummary(visitId: string): Promise<UnitWithDetails[]> {
    // This query joins viewed_units with units, then with floorplans and projects
    const result = await db
      .select({
        unit: units,
        floorPlan: floorPlans,
        project: projects,
      })
      .from(viewedUnits)
      .innerJoin(units, eq(viewedUnits.unitId, units.id))
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id))
      .where(eq(viewedUnits.visitId, visitId));

    // Use the existing helper to format the output
    return result.map((row) => this.mapToUnitWithDetails(row));
  }

  // Helper methods
  private mapToUnitWithDetails(row: any): UnitWithDetails {
    const unit = row.unit;
    const floorPlan = row.floorPlan;
    const project = row.project;

    // Map Supabase status values to CRM status values
    const statusMap: Record<string, string> = {
      Available: "available",
      Held: "on_hold",
      Sold: "sold",
      Contract: "contract",
      // Add lowercase variants just in case
      available: "available",
      held: "on_hold",
      sold: "sold",
      contract: "contract",
    };

    const mappedStatus = statusMap[unit.status] || "available";

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

  private async mapToDealLead(
    row: any,
    activities: Activity[],
  ): Promise<LeadWithDetails> {
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
      score: this.calculateDealScore(deal, activities),
      notes: deal.category ?? undefined,
    };
  }

  private calculateDealScore(deal: Deal, activities: Activity[]): number {
    // Simple scoring based on deal stage and activity count
    const stageScores: Record<string, number> = {
      new: 25,
      contacted: 40,
      qualified: 60,
      negotiating: 80,
      closed: 100,
      lost: 0,
    };

    const baseScore = stageScores[deal.dealStage] ?? 50;
    const activityBonus = Math.min(activities.length * 5, 25);

    return Math.min(baseScore + activityBonus, 100);
  }

  // Projects
  // NEW: Add the real implementation for getting a project by ID
  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return project;
  }
  async getProjectCounts() {
    const projectsData = await db.select().from(projects);
    const unitsData = await this.getAllUnits();

    return projectsData.map((project) => {
      const projectUnits = unitsData.filter((u) => u.projectId === project.id);
      return {
        id: project.id,
        name: project.name,
        address: project.address || `${project.name} Address`,
        totalUnits: projectUnits.length,
        available: projectUnits.filter((u) => u.status === "available").length,
        reserved: projectUnits.filter(
          (u) => u.status === "on_hold" || u.status === "contract",
        ).length,
        sold: projectUnits.filter((u) => u.status === "sold").length,
      };
    });
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTasksByLeadId(leadId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.leadId, leadId));
  }

  async getTasksByAgentId(agentId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.agentId, agentId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(insertTask).returning();
    return result[0];
  }

  async updateTask(
    id: string,
    updateData: Partial<InsertTask>,
  ): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  // Lead Engagement
  async getLeadEngagementByLeadId(leadId: string): Promise<LeadEngagement[]> {
    return db
      .select()
      .from(leadEngagement)
      .where(eq(leadEngagement.leadId, leadId));
  }

  async createLeadEngagement(
    insertEngagement: InsertLeadEngagement,
  ): Promise<LeadEngagement> {
    const result = await db
      .insert(leadEngagement)
      .values(insertEngagement)
      .returning();
    return result[0];
  }

  async calculateLeadScore(leadId: string): Promise<number> {
    const lead = await this.getLeadById(leadId);
    if (!lead) return 0;

    const engagements = await this.getLeadEngagementByLeadId(leadId);

    if (engagements.length === 0) {
      return lead.leadScore;
    }

    const totalScore = engagements.reduce((sum, e) => sum + e.scoreImpact, 0);
    const newScore = Math.max(0, Math.min(totalScore, 100));

    await db
      .update(leads)
      .set({
        leadScore: newScore,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    return newScore;
  }

  async detectEngagementSpike(leadId: string): Promise<boolean> {
    const engagements = await this.getLeadEngagementByLeadId(leadId);

    if (engagements.length < 3) return false;

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEngagements = engagements.filter(
      (e) => e.createdAt >= last24Hours,
    );

    return recentEngagements.length >= 3;
  }

  // Unit Matching
  async getMatchingUnitsForLead(leadId: string): Promise<UnitWithDetails[]> {
    const lead = await this.getLeadById(leadId);
    if (!lead) return [];

    const allUnits = await this.getAllUnits();

    return allUnits.filter((unit) => {
      if (unit.status !== "available") return false;

      if (lead.targetPriceMin && lead.targetPriceMax) {
        const price = parseFloat(unit.price);
        const minPrice = parseFloat(lead.targetPriceMin);
        const maxPrice = parseFloat(lead.targetPriceMax);

        if (isNaN(price) || isNaN(minPrice) || isNaN(maxPrice)) return false;
        if (price < minPrice || price > maxPrice) return false;
      }

      if (lead.targetLocations && lead.targetLocations.length > 0) {
        if (!lead.targetLocations.includes(unit.building)) return false;
      }

      return true;
    });
  }

  // Unit Leads - Get all leads/deals for a specific unit
  async getLeadsByUnit(
    projectId: string,
    unitNumber: string,
  ): Promise<LeadWithDetails[]> {
    const result = await db
      .select({
        deal: deals,
        contact: contacts,
        broker: contacts,
        unit: units,
        floorPlan: floorPlans,
        project: projects,
      })
      .from(deals)
      .innerJoin(contacts, eq(deals.buyerContactId, contacts.id))
      .leftJoin(units, eq(deals.unitId, units.id))
      .leftJoin(floorPlans, eq(units.floorPlanId, floorPlans.id))
      .leftJoin(projects, eq(units.projectId, projects.id))
      .where(
        and(eq(units.projectId, projectId), eq(units.unitNumber, unitNumber)),
      );

    const leadsWithDetails: LeadWithDetails[] = [];

    for (const row of result) {
      const broker = row.deal.brokerContactId
        ? await this.getBrokerById(row.deal.brokerContactId)
        : undefined;

      const dealActivities = await this.getActivitiesByLeadId(row.deal.id);

      leadsWithDetails.push({
        ...row.deal,
        contact: row.contact,
        broker,
        unit: row.unit
          ? this.mapToUnitWithDetails({
              unit: row.unit,
              floorPlan: row.floorPlan,
              project: row.project,
            })
          : undefined,
        activities: dealActivities,
        status: row.deal.dealStage,
        score: 0,
        notes: row.deal.category || undefined,
      });
    }

    return leadsWithDetails;
  }

  // AI Conversations
  async createConversation(
    insertConversation: InsertAiConversation,
  ): Promise<AiConversation> {
    const [conversation] = await db
      .insert(aiConversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversationByConversationId(
    conversationId: string,
  ): Promise<AiConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.conversationId, conversationId))
      .limit(1);
    return conversation;
  }

  async getConversationsByAgentId(agentId: string): Promise<AiConversation[]> {
    return await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.agentId, agentId))
      .orderBy(sql`${aiConversations.updatedAt} DESC`);
  }

  async updateConversationTitle(
    conversationId: string,
    title: string,
  ): Promise<AiConversation | undefined> {
    const [conversation] = await db
      .update(aiConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(aiConversations.conversationId, conversationId))
      .returning();
    return conversation;
  }

  async touchConversation(conversationId: string): Promise<void> {
    await db
      .update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.conversationId, conversationId));
  }

  // AI Messages
  async createMessage(insertMessage: InsertAiMessage): Promise<AiMessage> {
    const [message] = await db
      .insert(aiMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesByConversationId(
    conversationId: string,
  ): Promise<AiMessage[]> {
    return await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(sql`${aiMessages.createdAt} ASC`);
  }

  // AI Feedback
  async createFeedback(insertFeedback: InsertAiFeedback): Promise<AiFeedback> {
    const [feedback] = await db
      .insert(aiFeedback)
      .values(insertFeedback)
      .returning();
    return feedback;
  }

  async getFeedbackByMessageId(
    messageId: string,
  ): Promise<AiFeedback | undefined> {
    const [feedback] = await db
      .select()
      .from(aiFeedback)
      .where(eq(aiFeedback.messageId, messageId))
      .limit(1);
    return feedback;
  }
  async getVisitById(visitId: string): Promise<Visit | undefined> {
    const [visit] = await db
      .select()
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);
    return visit;
  }
}
