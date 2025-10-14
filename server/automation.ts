import { storage } from "./storage";
import type { Lead } from "@shared/schema";

export async function handleLeadQualified(
  lead: Lead,
  agentId: string,
): Promise<void> {
  const matchedUnits = await storage.getMatchingUnitsForLead(lead.id);

  await storage.createTask({
    title: `Review Qualified Lead: ${lead.name}`,
    description: `Lead qualified with budget $${lead.targetPriceMin || 0}-$${lead.targetPriceMax || 0}. ${matchedUnits.length} matching units found.`,
    priority: "high",
    status: "pending",
    agentId: agentId,
    leadId: lead.id,
    automationSource: "lead_qualified",
  });

  if (matchedUnits.length > 0) {
    await storage.createTask({
      title: `Present Units to ${lead.name}`,
      description: `Show ${matchedUnits.length} matched units based on qualification criteria.`,
      priority: "medium",
      status: "pending",
      agentId: agentId,
      leadId: lead.id,
      automationSource: "lead_qualified",
    });
  }
}

export async function handleShowingComplete(contactId: string, agentId: string, sessionId: string) {
  try {
    // Find the lead associated with this contact
    const contact = await storage.getContactById(contactId);
    if (!contact) return;

    const allLeads = await storage.getAllLeads();
    const lead = allLeads.find(l => l.email === contact.email);
    if (!lead) return;

    // Create follow-up task for agent
    await storage.createTask({
      leadId: lead.id,
      agentId,
      title: "Post-Showing Follow-up Required",
      description: `Follow up with ${lead.name} after showing session. Review toured units and next steps.`,
      priority: "high",
      status: "pending",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      automationSource: "showing_complete",
    });

    console.log(`[Automation] Created post-showing follow-up task for lead ${lead.id}`);
  } catch (error) {
    console.error("[Automation] Error in handleShowingComplete:", error);
  }
}

export async function handleEngagementSpike(
  lead: Lead,
  agentId: string,
): Promise<void> {
  await storage.createTask({
    title: `URGENT: High Engagement from ${lead.name}`,
    description: `Lead is showing strong interest signals. Contact immediately to capitalize on engagement.`,
    priority: "urgent",
    status: "pending",
    agentId: agentId,
    leadId: lead.id,
    automationSource: "engagement_spike",
  });
}

export async function handlePipelineStageChange(
  lead: Lead,
  oldStage: string,
  newStage: string,
  agentId: string,
): Promise<void> {
  const normalizedOldStage = (oldStage || "").toLowerCase();
  const normalizedNewStage = (newStage || "").toLowerCase();

  if (
    normalizedNewStage === "qualified" &&
    normalizedOldStage !== "qualified"
  ) {
    await handleLeadQualified(lead, agentId);
  }

  if (normalizedNewStage === "contract") {
    await storage.createTask({
      title: `Prepare Contract for ${lead.name}`,
      description: `Lead has moved to contract stage. Prepare and send contract documents.`,
      priority: "high",
      status: "pending",
      agentId: agentId,
      leadId: lead.id,
      automationSource: "pipeline_stage_change",
    });
  }

  if (normalizedNewStage === "closed won") {
    await storage.createTask({
      title: `Post-Sale Follow-up: ${lead.name}`,
      description: `Sale closed successfully. Schedule post-sale follow-up and gather feedback.`,
      priority: "low",
      status: "pending",
      agentId: agentId,
      leadId: lead.id,
      automationSource: "pipeline_stage_change",
    });
  }
}
// NEW: Add the business logic for the post-showing workflow
export async function handlePostShowing(visit: Visit): Promise<void> {
  const summary = await storage.getVisitSummary(visit.id);
  if (summary.length === 0) {
    console.log(
      `No units viewed for visit ${visit.id}, skipping follow-up task.`,
    );
    return;
  }

  const unitNumbers = summary.map((u) => u.unitNumber).join(", ");
  const taskTitle = `Follow up on showing for units: ${unitNumbers}`;
  const taskDescription = `Client viewed ${summary.length} unit(s). Send a personalized follow-up email with the 'portal' link and floor plans for units ${unitNumbers}.`;

  await storage.createTask({
    leadId: visit.leadId,
    agentId: visit.agentId,
    title: taskTitle,
    description: taskDescription,
    priority: "high",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
    automationSource: "post-showing-workflow",
  });

  console.log(`Successfully created post-showing task for visit ${visit.id}`);
}