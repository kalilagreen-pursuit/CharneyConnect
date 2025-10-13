import {
  type UnitWithDetails,
  type UnitWithDealContext,
  type InsertUnit,
  type UnitStatus,
  type Contact,
  type InsertContact,
  type Lead,
  type InsertLead,
  type DealLead,
  type InsertDeal,
  type LeadWithDetails,
  type Activity,
  type InsertActivity,
  type Task,
  type InsertTask,
  type TaskWithLead,
  type LeadEngagement,
  type InsertLeadEngagement,
  type LeadWithEngagement,
  type AiConversation,
  type InsertAiConversation,
  type AiMessage,
  type InsertAiMessage,
  type AiFeedback,
  type InsertAiFeedback,
  type Visit,
  type ViewedUnit,
  type Project, // FIXED: Added missing Project type import
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Units
  getAllUnits(): Promise<UnitWithDetails[]>;
  getUnitById(id: string): Promise<UnitWithDetails | undefined>;
  getUnitsByAgentId(
    agentId: string,
    projectId?: string,
    showAllProjectUnits?: boolean,
  ): Promise<UnitWithDetails[]>;
  getActiveDealsByAgentId(
    agentId: string,
    projectId?: string,
  ): Promise<UnitWithDealContext[]>;
  createUnit(unit: InsertUnit): Promise<UnitWithDetails>;
  updateUnitStatus(
    id: string,
    status: UnitStatus,
  ): Promise<UnitWithDetails | undefined>;
  updateUnitPrice(
    id: string,
    price: number,
  ): Promise<UnitWithDetails | undefined>;

  // Contacts
  getAllContacts(): Promise<Contact[]>;
  getContactById(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  searchContacts(query: string): Promise<Contact[]>;

  // Brokers
  getAllBrokers(): Promise<Contact[]>;
  getBrokerById(id: string): Promise<Contact | undefined>;
  createBroker(broker: any): Promise<Contact>;

  // Agents (NEW - for fetching agent data)
  getAgentById(id: string): Promise<any | undefined>; // Using 'any' to match your schema, can be typed later

  // Leads
  getAllLeads(projectId?: string): Promise<Lead[]>; // Added optional projectId
  getLeadById(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;

  // Deal-based leads (legacy)
  getAllDealLeads(): Promise<LeadWithDetails[]>;
  getDealLeadById(id: string): Promise<LeadWithDetails | undefined>;
  createDealLead(lead: InsertDeal): Promise<DealLead>;

  // Activities
  getActivitiesByLeadId(leadId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Projects
  getProjectById(id: string): Promise<Project | undefined>; // FIXED: Added this signature
  getProjectCounts(): Promise<
    Array<{
      id: string;
      name: string;
      address: string;
      totalUnits: number;
      available: number;
      reserved: number;
      sold: number;
    }>
  >;

  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTasksByLeadId(leadId: string): Promise<Task[]>;
  getTasksByAgentId(agentId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  completeTask(id: string): Promise<Task | undefined>;

  // Lead Engagement
  getLeadEngagementByLeadId(leadId: string): Promise<LeadEngagement[]>;
  createLeadEngagement(
    engagement: InsertLeadEngagement,
  ): Promise<LeadEngagement>;
  calculateLeadScore(leadId: string): Promise<number>;
  detectEngagementSpike(leadId: string): Promise<boolean>;

  // Unit Matching
  getMatchingUnitsForLead(leadId: string): Promise<UnitWithDetails[]>;

  // Unit Leads
  getLeadsByUnit(
    projectId: string,
    unitNumber: string,
  ): Promise<LeadWithDetails[]>;

  // AI Conversations
  createConversation(
    conversation: InsertAiConversation,
  ): Promise<AiConversation>;
  getConversationByConversationId(
    conversationId: string,
  ): Promise<AiConversation | undefined>;
  getConversationsByAgentId(agentId: string): Promise<AiConversation[]>;
  updateConversationTitle(
    conversationId: string,
    title: string,
  ): Promise<AiConversation | undefined>;
  touchConversation(conversationId: string): Promise<void>;

  // AI Messages
  createMessage(message: InsertAiMessage): Promise<AiMessage>;
  getMessagesByConversationId(conversationId: string): Promise<AiMessage[]>;

  // AI Feedback
  createFeedback(feedback: InsertAiFeedback): Promise<AiFeedback>;
  getFeedbackByMessageId(messageId: string): Promise<AiFeedback | undefined>;

  // Showing Session (Visit) Management
  createVisit(
    visitData: Pick<Visit, "leadId" | "agentId" | "projectId">,
  ): Promise<Visit>;
  logUnitView(visitId: string, unitId: string): Promise<ViewedUnit>;
  getVisitSummary(visitId: string): Promise<UnitWithDetails[]>;
  getVisitById(visitId: string): Promise<Visit | undefined>;
} // FIXED: Correctly closed the IStorage interface

export class MemStorage implements IStorage {
  private units: Map<string, UnitWithDetails>;
  private contacts: Map<string, Contact>;
  private leads: Map<string, Lead>;
  private dealLeads: Map<string, DealLead>;
  private activities: Map<string, Activity>;

  constructor() {
    this.units = new Map();
    this.contacts = new Map();
    this.leads = new Map();
    this.dealLeads = new Map();
    this.activities = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed Units with full UnitWithDetails structure
    const unitsData: UnitWithDetails[] = [
      {
        id: randomUUID(),
        unitNumber: "101",
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 650,
        price: "425000",
        status: "available",
        building: "Tower A",
        projectId: "1",
        floorPlanId: "1",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "102",
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 680,
        price: "445000",
        status: "available",
        building: "Tower A",
        projectId: "1",
        floorPlanId: "1",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "201",
        floor: 2,
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 950,
        price: "625000",
        status: "on_hold",
        building: "Tower A",
        projectId: "1",
        floorPlanId: "2",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "202",
        floor: 2,
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 980,
        price: "645000",
        status: "contract",
        building: "Tower A",
        projectId: "1",
        floorPlanId: "2",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "301",
        floor: 3,
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 1050,
        price: "695000",
        status: "available",
        building: "Tower A",
        projectId: "1",
        floorPlanId: "2",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "302",
        floor: 3,
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 1080,
        price: "715000",
        status: "sold",
        building: "Tower A",
        projectId: "1",
        floorPlanId: "2",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "401",
        floor: 4,
        bedrooms: 3,
        bathrooms: 2.5,
        squareFeet: 1450,
        price: "895000",
        status: "available",
        building: "Tower B",
        projectId: "2",
        floorPlanId: "3",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "402",
        floor: 4,
        bedrooms: 3,
        bathrooms: 2.5,
        squareFeet: 1480,
        price: "915000",
        status: "on_hold",
        building: "Tower B",
        projectId: "2",
        floorPlanId: "3",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "501",
        floor: 5,
        bedrooms: 3,
        bathrooms: 3,
        squareFeet: 1650,
        price: "1025000",
        status: "contract",
        building: "Tower B",
        projectId: "2",
        floorPlanId: "4",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "502",
        floor: 5,
        bedrooms: 3,
        bathrooms: 3,
        squareFeet: 1680,
        price: "1045000",
        status: "available",
        building: "Tower B",
        projectId: "2",
        floorPlanId: "4",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "601",
        floor: 6,
        bedrooms: 3,
        bathrooms: 3,
        squareFeet: 1750,
        price: "1125000",
        status: "sold",
        building: "Tower B",
        projectId: "2",
        floorPlanId: "4",
        notes: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        unitNumber: "PH1",
        floor: 7,
        bedrooms: 4,
        bathrooms: 4,
        squareFeet: 2500,
        price: "1750000",
        status: "available",
        building: "Tower B",
        projectId: "2",
        floorPlanId: "5",
        notes: null,
        createdAt: new Date(),
      },
    ];

    unitsData.forEach((unit) => {
      this.units.set(unit.id, unit);
    });

    // Seed Contacts
    const contactsData: InsertContact[] = [
      {
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah.chen@email.com",
        phone: "(555) 123-4567",
        contactType: "buyer",
      },
      {
        firstName: "Michael",
        lastName: "Rodriguez",
        email: "m.rodriguez@email.com",
        phone: "(555) 234-5678",
        contactType: "buyer",
      },
      {
        firstName: "Emily",
        lastName: "Thompson",
        email: "emily.t@email.com",
        phone: "(555) 345-6789",
        contactType: "buyer",
      },
      {
        firstName: "David",
        lastName: "Kim",
        email: "david.kim@email.com",
        phone: "(555) 456-7890",
        contactType: "buyer",
      },
      {
        firstName: "Jessica",
        lastName: "Martinez",
        email: "j.martinez@email.com",
        phone: "(555) 567-8901",
        contactType: "buyer",
      },
      {
        firstName: "Robert",
        lastName: "Williams",
        email: "r.williams@realty.com",
        phone: "(555) 111-2222",
        contactType: "broker",
      },
      {
        firstName: "Amanda",
        lastName: "Johnson",
        email: "a.johnson@realty.com",
        phone: "(555) 222-3333",
        contactType: "broker",
      },
      {
        firstName: "James",
        lastName: "Brown",
        email: "j.brown@realty.com",
        phone: "(555) 333-4444",
        contactType: "broker",
      },
    ];

    contactsData.forEach((contact) => {
      const id = randomUUID();
      const contactWithDefaults: Contact = {
        ...contact,
        id,
        createdAt: new Date(),
        consentGivenAt: null,
      };
      this.contacts.set(id, contactWithDefaults);
    });

    // Seed Leads (public.leads table format)
    const leadsData: InsertLead[] = [
      {
        name: "Sarah Chen",
        email: "sarah.chen@email.com",
        status: "qualified",
        value: 625000,
        phone: "(555) 123-4567",
      },
      {
        name: "Michael Rodriguez",
        email: "m.rodriguez@email.com",
        status: "negotiating",
        value: 645000,
        phone: "(555) 234-5678",
      },
      {
        name: "Emily Thompson",
        email: "emily.t@email.com",
        status: "contacted",
        value: 895000,
        phone: "(555) 345-6789",
      },
      {
        name: "David Kim",
        email: "david.kim@email.com",
        status: "qualified",
        value: 1750000,
        phone: "(555) 456-7890",
      },
      {
        name: "Jessica Martinez",
        email: "j.martinez@email.com",
        status: "new",
        value: 695000,
        phone: "(555) 567-8901",
      },
    ];

    leadsData.forEach((lead) => {
      const id = randomUUID();
      const leadWithDefaults: Lead = {
        ...lead,
        id,
        value: lead.value ?? null,
        phone: lead.phone ?? null,
        company: lead.company ?? null,
        address: lead.address ?? null,
        targetPriceMin: null,
        targetPriceMax: null,
        targetLocations: null,
        timeFrameToBuy: null,
        leadScore: 0,
        pipelineStage: "new",
        agentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.leads.set(id, leadWithDefaults);
    });

    // Seed Activities (using deal IDs - for legacy support, we'll skip this for now)
    // Activities are linked to deals, not public.leads
  }

  // Agents
  async getAllAgents(): Promise<import("@shared/schema").Agent[]> {
    return [];
  }

  // Units
  async getAllUnits(): Promise<UnitWithDetails[]> {
    return Array.from(this.units.values());
  }

  async getUnitById(id: string): Promise<UnitWithDetails | undefined> {
    return this.units.get(id);
  }

  async getUnitsByAgentId(
    agentId: string,
    projectId?: string,
    showAllProjectUnits?: boolean,
  ): Promise<UnitWithDetails[]> {
    // MemStorage doesn't have deals, return all units (optionally filtered by projectId)
    const allUnits = await this.getAllUnits();
    if (projectId) {
      return allUnits.filter((unit) => unit.projectId === projectId);
    }
    return allUnits;
  }

  async getActiveDealsByAgentId(
    agentId: string,
    projectId?: string,
  ): Promise<UnitWithDealContext[]> {
    // MemStorage doesn't have deals, return empty array
    return [];
  }

  async createUnit(insertUnit: InsertUnit): Promise<UnitWithDetails> {
    const id = randomUUID();
    const unit: UnitWithDetails = {
      ...insertUnit,
      id,
      bedrooms: 0,
      bathrooms: 0,
      squareFeet: 0,
      building: "Unknown",
      createdAt: new Date(),
    } as UnitWithDetails;
    this.units.set(id, unit);
    return unit;
  }

  async updateUnitStatus(
    id: string,
    status: UnitStatus,
  ): Promise<UnitWithDetails | undefined> {
    const unit = this.units.get(id);
    if (!unit) return undefined;

    const updatedUnit = { ...unit, status };
    this.units.set(id, updatedUnit);
    return updatedUnit;
  }

  async updateUnitPrice(
    id: string,
    price: number,
  ): Promise<UnitWithDetails | undefined> {
    const unit = this.units.get(id);
    if (!unit) return undefined;

    const updatedUnit = { ...unit, price: price.toString() };
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
    const contact: Contact = {
      ...insertContact,
      id,
      createdAt: new Date(),
      consentGivenAt: insertContact.consentGivenAt ?? null,
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const allContacts = Array.from(this.contacts.values());
    const lowerQuery = query.toLowerCase();
    return allContacts.filter(
      (contact) =>
        contact.firstName.toLowerCase().includes(lowerQuery) ||
        contact.lastName.toLowerCase().includes(lowerQuery) ||
        contact.email.toLowerCase().includes(lowerQuery) ||
        (contact.phone && contact.phone.toLowerCase().includes(lowerQuery)),
    );
  }

  // Brokers (using contacts table)
  async getAllBrokers(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(
      (c) => c.contactType === "broker",
    );
  }

  async getBrokerById(id: string): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    return contact?.contactType === "broker" ? contact : undefined;
  }

  async createBroker(insertBroker: any): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      ...insertBroker,
      id,
      contactType: "broker",
      createdAt: new Date(),
      consentGivenAt: null,
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async getAgentById(id: string): Promise<Agent | undefined> {
    console.log(`[MemStorage] Stub: Faking getAgentById for ${id}`);
    // Return a default agent for local testing
    return {
      id,
      name: "Mock Agent",
      email: "mock@charney.email",
      role: "Sales Agent",
    };
  }

  // Leads (public.leads table)
  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const lead: Lead = {
      ...insertLead,
      id,
      value: insertLead.value ?? null,
      phone: insertLead.phone ?? null,
      company: insertLead.company ?? null,
      address: insertLead.address ?? null,
      targetPriceMin: insertLead.targetPriceMin ?? null,
      targetPriceMax: insertLead.targetPriceMax ?? null,
      targetLocations: insertLead.targetLocations ?? null,
      timeFrameToBuy: insertLead.timeFrameToBuy ?? null,
      leadScore: insertLead.leadScore ?? 0,
      pipelineStage: insertLead.pipelineStage ?? "new",
      agentId: insertLead.agentId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(
    id: string,
    updateData: Partial<InsertLead>,
  ): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;

    const updatedLead = { ...lead, ...updateData, updatedAt: new Date() };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  // Deal-based leads (legacy)
  async getAllDealLeads(): Promise<LeadWithDetails[]> {
    return Array.from(this.dealLeads.values()).map((deal) => ({
      ...deal,
      activities: [],
    }));
  }

  async getDealLeadById(id: string): Promise<LeadWithDetails | undefined> {
    const deal = this.dealLeads.get(id);
    if (!deal) return undefined;
    return {
      ...deal,
      activities: [],
    };
  }

  async createDealLead(insertDeal: InsertDeal): Promise<DealLead> {
    const id = randomUUID();
    const contact = await this.getContactById(insertDeal.buyerContactId);
    if (!contact) throw new Error("Contact not found");

    const deal: DealLead = {
      id,
      createdAt: new Date(),
      unitId: insertDeal.unitId,
      buyerContactId: insertDeal.buyerContactId,
      brokerContactId: insertDeal.brokerContactId ?? null,
      agentId: insertDeal.agentId,
      dealStage: insertDeal.dealStage,
      salePrice: insertDeal.salePrice ?? null,
      category: insertDeal.category ?? null,
      contact,
      activities: [],
      status: insertDeal.dealStage,
      score: 0,
    };
    this.dealLeads.set(id, deal);
    return deal;
  }

  // Activities
  async getActivitiesByLeadId(leadId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(
      (activity) => activity.dealId === leadId,
    );
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { ...insertActivity, id, createdAt: new Date() };
    this.activities.set(id, activity);
    return activity;
  }

  // Projects
  async getProjectCounts() {
    const units = Array.from(this.units.values());
    const projectMap = new Map<
      string,
      {
        id: number;
        name: string;
        address: string;
        units: UnitWithDetails[];
      }
    >();

    units.forEach((unit) => {
      const projectKey = unit.building;
      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, {
          id: parseInt(unit.projectId) || 0,
          name: unit.building,
          address: `${unit.building} Address`,
          units: [],
        });
      }
      projectMap.get(projectKey)!.units.push(unit);
    });

    return Array.from(projectMap.values()).map((project) => ({
      id: project.id.toString(),
      name: project.name,
      address: project.address,
      totalUnits: project.units.length,
      available: project.units.filter((u) => u.status === "available").length,
      reserved: project.units.filter(
        (u) => u.status === "on_hold" || u.status === "contract",
      ).length,
      sold: project.units.filter((u) => u.status === "sold").length,
    }));
  }

  // Tasks (stub implementations for MemStorage)
  async getAllTasks(): Promise<Task[]> {
    return [];
  }

  async getTasksByLeadId(leadId: string): Promise<Task[]> {
    return [];
  }

  async getTasksByAgentId(agentId: string): Promise<Task[]> {
    return [];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = randomUUID();
    const newTask: Task = {
      ...task,
      id,
      description: task.description ?? null,
      status: task.status ?? "pending",
      priority: task.priority ?? "medium",
      dueDate: task.dueDate ?? null,
      completedAt: task.completedAt ?? null,
      automationSource: task.automationSource ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newTask;
  }

  async updateTask(
    id: string,
    task: Partial<InsertTask>,
  ): Promise<Task | undefined> {
    return undefined;
  }

  async completeTask(id: string): Promise<Task | undefined> {
    return undefined;
  }

  // Lead Engagement (stub implementations for MemStorage)
  async getLeadEngagementByLeadId(leadId: string): Promise<LeadEngagement[]> {
    return [];
  }

  async createLeadEngagement(
    engagement: InsertLeadEngagement,
  ): Promise<LeadEngagement> {
    const id = randomUUID();
    const newEngagement: LeadEngagement = {
      ...engagement,
      id,
      eventMetadata: engagement.eventMetadata ?? null,
      scoreImpact: engagement.scoreImpact ?? 0,
      createdAt: new Date(),
    };
    return newEngagement;
  }

  async calculateLeadScore(leadId: string): Promise<number> {
    return 0;
  }

  async detectEngagementSpike(leadId: string): Promise<boolean> {
    return false;
  }

  // Unit Matching
  async getMatchingUnitsForLead(leadId: string): Promise<UnitWithDetails[]> {
    const lead = this.leads.get(leadId);
    if (!lead) return [];

    const allUnits = Array.from(this.units.values());

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

  // Unit Leads
  async getLeadsByUnit(
    projectId: string,
    unitNumber: string,
  ): Promise<LeadWithDetails[]> {
    return [];
  }

  // AI Conversations (stub implementations for MemStorage)
  async createConversation(
    conversation: InsertAiConversation,
  ): Promise<AiConversation> {
    const id = randomUUID();
    return {
      id,
      ...conversation,
      title: conversation.title ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getConversationByConversationId(
    conversationId: string,
  ): Promise<AiConversation | undefined> {
    return undefined;
  }

  async getConversationsByAgentId(agentId: string): Promise<AiConversation[]> {
    return [];
  }

  async updateConversationTitle(
    conversationId: string,
    title: string,
  ): Promise<AiConversation | undefined> {
    return undefined;
  }

  async touchConversation(conversationId: string): Promise<void> {
    // Stub: MemStorage doesn't persist
  }

  // AI Messages (stub implementations for MemStorage)
  async createMessage(message: InsertAiMessage): Promise<AiMessage> {
    const id = randomUUID();
    return {
      id,
      ...message,
      createdAt: new Date(),
    };
  }

  async getMessagesByConversationId(
    conversationId: string,
  ): Promise<AiMessage[]> {
    return [];
  }

  // AI Feedback (stub implementations for MemStorage)
  async createFeedback(feedback: InsertAiFeedback): Promise<AiFeedback> {
    const id = randomUUID();
    return {
      id,
      ...feedback,
      comment: feedback.comment ?? null,
      createdAt: new Date(),
    };
  }

  async getFeedbackByMessageId(
    messageId: string,
  ): Promise<AiFeedback | undefined> {
    return undefined;
  }

  // NEW: Showing Session (Visit) stubs for MemStorage
  async createVisit(
    visitData: Pick<Visit, "leadId" | "agentId" | "projectId">,
  ): Promise<Visit> {
    const id = randomUUID();
    const newVisit: Visit = {
      id,
      ...visitData,
      startedAt: new Date(),
      endedAt: null,
    };
    this.visits.set(id, newVisit); // Store the new visit
    console.log("[MemStorage] Creating mock visit:", newVisit);
    return newVisit;
  }

  async logUnitView(visitId: string, unitId: string): Promise<ViewedUnit> {
    const id = randomUUID();
    const newView: ViewedUnit = {
      id,
      visitId,
      unitId,
      viewedAt: new Date(),
    };
    console.log("[MemStorage] Logging mock unit view:", newView);
    return newView;
  }

  async getVisitSummary(visitId: string): Promise<UnitWithDetails[]> {
    console.log(
      `[MemStorage] Stub: Faking getVisitSummary for visitId: ${visitId}. Returning empty array.`,
    );
    // For the MVP's local dev mode, returning an empty array is sufficient to fulfill the contract.
    return [];
  }

  async getVisitById(visitId: string): Promise<Visit | undefined> {
    console.log(`[MemStorage] Retrieving visit with ID: ${visitId}`);
    return this.visits.get(visitId); // Return the visit from the map
  }
}

import { PostgresStorage } from "./postgres-storage";

// Use PostgresStorage with Supabase database
export const storage = process.env.DATABASE_URL
  ? new PostgresStorage()
  : new MemStorage();
