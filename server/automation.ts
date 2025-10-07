import { storage } from "./storage";
import type { Lead } from "@shared/schema";

export async function handleLeadQualified(lead: Lead, agentId: string): Promise<void> {
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

export async function handleEngagementSpike(lead: Lead, agentId: string): Promise<void> {
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
  agentId: string
): Promise<void> {
  const normalizedOldStage = (oldStage || "").toLowerCase();
  const normalizedNewStage = (newStage || "").toLowerCase();

  if (normalizedNewStage === "qualified" && normalizedOldStage !== "qualified") {
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
