
import { Lead, UnitWithDetails, ClientPreferences } from "@shared/schema";

export interface UnitMatch {
  unitId: string;
  matchScore: number;
  matchReasons: string[];
  isStrongMatch: boolean;
  isPerfectMatch: boolean;
}

/**
 * Calculate match score between a unit and client preferences
 * Returns a score from 0-100 representing match quality
 */
export function calculateUnitMatchScore(
  unit: UnitWithDetails,
  preferences: ClientPreferences
): UnitMatch {
  let score = 0;
  const matchReasons: string[] = [];
  let totalCriteria = 0;

  // Price match (25 points)
  if (preferences.targetPriceMin !== undefined || preferences.targetPriceMax !== undefined) {
    totalCriteria += 25;
    const unitPrice = typeof unit.price === 'string' ? parseFloat(unit.price) : unit.price;
    const minPrice = preferences.targetPriceMin ? parseFloat(preferences.targetPriceMin.toString()) : 0;
    const maxPrice = preferences.targetPriceMax ? parseFloat(preferences.targetPriceMax.toString()) : Infinity;

    if (unitPrice >= minPrice && unitPrice <= maxPrice) {
      score += 25;
      matchReasons.push(`Within budget ($${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()})`);
    }
  }

  // Location/Building match (20 points)
  if (preferences.targetLocations && preferences.targetLocations.length > 0) {
    totalCriteria += 20;
    if (preferences.targetLocations.includes(unit.building)) {
      score += 20;
      matchReasons.push(`Preferred location: ${unit.building}`);
    }
  }

  // Bedrooms match (20 points)
  if (preferences.targetBedrooms !== undefined) {
    totalCriteria += 20;
    if (unit.bedrooms === preferences.targetBedrooms) {
      score += 20;
      matchReasons.push(`${unit.bedrooms} bedrooms (exact match)`);
    } else if (Math.abs(unit.bedrooms - preferences.targetBedrooms) === 1) {
      score += 10;
      matchReasons.push(`${unit.bedrooms} bedrooms (close match)`);
    }
  }

  // Bathrooms match (15 points)
  if (preferences.targetBathrooms !== undefined) {
    totalCriteria += 15;
    const unitBaths = typeof unit.bathrooms === 'string' ? parseFloat(unit.bathrooms) : unit.bathrooms;
    const targetBaths = typeof preferences.targetBathrooms === 'string' ? parseFloat(preferences.targetBathrooms.toString()) : preferences.targetBathrooms;
    
    if (unitBaths === targetBaths) {
      score += 15;
      matchReasons.push(`${unitBaths} bathrooms (exact match)`);
    } else if (Math.abs(unitBaths - targetBaths) === 0.5) {
      score += 8;
      matchReasons.push(`${unitBaths} bathrooms (close match)`);
    }
  }

  // Square footage match (20 points)
  if (preferences.targetSqftMin !== undefined || preferences.targetSqftMax !== undefined) {
    totalCriteria += 20;
    const minSqft = preferences.targetSqftMin || 0;
    const maxSqft = preferences.targetSqftMax || Infinity;

    if (unit.squareFeet >= minSqft && unit.squareFeet <= maxSqft) {
      score += 20;
      matchReasons.push(`${unit.squareFeet.toLocaleString()} sq ft (within range)`);
    }
  }

  // Normalize score to 0-100 scale
  const normalizedScore = totalCriteria > 0 ? Math.round((score / totalCriteria) * 100) : 0;

  return {
    unitId: unit.id,
    matchScore: normalizedScore,
    matchReasons,
    isStrongMatch: normalizedScore >= 70,
    isPerfectMatch: normalizedScore >= 90,
  };
}

/**
 * Get matched units for a lead with scoring
 */
export function getMatchedUnitsWithScores(
  units: UnitWithDetails[],
  lead: Lead | null
): Map<string, UnitMatch> {
  const matchMap = new Map<string, UnitMatch>();

  if (!lead) return matchMap;

  const preferences: ClientPreferences = {
    targetPriceMin: lead.targetPriceMin ? parseFloat(lead.targetPriceMin) : undefined,
    targetPriceMax: lead.targetPriceMax ? parseFloat(lead.targetPriceMax) : undefined,
    targetLocations: lead.targetLocations,
    targetBedrooms: lead.targetBedrooms || undefined,
    targetBathrooms: lead.targetBathrooms ? parseFloat(lead.targetBathrooms.toString()) : undefined,
    targetSqftMin: lead.targetSqftMin || undefined,
    targetSqftMax: lead.targetSqftMax || undefined,
    desiredViews: lead.desiredViews,
    timeFrameToBuy: lead.timeFrameToBuy || undefined,
  };

  units.forEach(unit => {
    const match = calculateUnitMatchScore(unit, preferences);
    if (match.matchScore > 0) {
      matchMap.set(unit.id, match);
    }
  });

  return matchMap;
}

/**
 * Get visual indicator class based on match score
 */
export function getMatchIndicatorClass(matchScore: number): string {
  if (matchScore >= 90) return "border-l-4 border-l-status-available bg-status-available/10";
  if (matchScore >= 70) return "border-l-4 border-l-status-contract bg-status-contract/10";
  if (matchScore >= 50) return "border-l-4 border-l-status-on-hold bg-status-on-hold/10";
  return "";
}

/**
 * Get match badge details
 */
export function getMatchBadge(matchScore: number): { label: string; variant: "default" | "secondary" | "outline" } | null {
  if (matchScore >= 90) return { label: "PERFECT MATCH", variant: "default" };
  if (matchScore >= 70) return { label: "STRONG MATCH", variant: "default" };
  if (matchScore >= 50) return { label: "GOOD MATCH", variant: "secondary" };
  return null;
}
