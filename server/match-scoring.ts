import type { UnitWithDetails } from "@shared/schema";

export interface MatchPreferences {
  targetPriceMin?: string;
  targetPriceMax?: string;
  targetBedrooms?: number;
  targetBathrooms?: number;
  targetSqftMin?: number;
  targetSqftMax?: number;
  targetLocations?: string[];
}

/**
 * Calculate match score for a unit based on client preferences
 * @param unit - The unit to score
 * @param preferences - Client preferences for matching
 * @returns Match score from 0-100
 */
export function calculateMatchScore(
  unit: UnitWithDetails,
  preferences: ClientPreferences,
): number {
  let score = 0;
  let maxScore = 0;

  // Price matching (weight: 40)
  if (preferences.targetPriceMin && preferences.targetPriceMax) {
    maxScore += 40;
    const unitPrice =
      typeof unit.price === "string" ? parseFloat(unit.price) : unit.price;

    if (
      unitPrice >= preferences.targetPriceMin &&
      unitPrice <= preferences.targetPriceMax
    ) {
      score += 40;
    } else if (unitPrice < preferences.targetPriceMin) {
      // Below budget - give good credit (they can afford it)
      const priceDiff = preferences.targetPriceMin - unitPrice;
      const priceRange =
        preferences.targetPriceMax - preferences.targetPriceMin;
      score += Math.max(15, 40 - (priceDiff / priceRange) * 15);
    } else {
      // Above budget - less forgiving
      const priceDiff = unitPrice - preferences.targetPriceMax;
      const priceRange =
        preferences.targetPriceMax - preferences.targetPriceMin;
      score += Math.max(0, 40 - (priceDiff / priceRange) * 35);
    }
  }

  // Bedrooms matching (weight: 25)
  if (preferences.targetBedrooms) {
    maxScore += 25;
    if (unit.bedrooms === preferences.targetBedrooms) {
      score += 25;
    } else if (Math.abs(unit.bedrooms - preferences.targetBedrooms) === 1) {
      // One bedroom off - good partial credit
      score += 15;
    }
  }

  // Bathrooms matching (weight: 15)
  if (preferences.targetBathrooms) {
    maxScore += 15;
    if (unit.bathrooms >= preferences.targetBathrooms) {
      score += 15;
    } else if (unit.bathrooms >= preferences.targetBathrooms - 0.5) {
      score += 10;
    }
  }

  // Location matching (weight: 15)
  if (
    preferences.targetLocations &&
    preferences.targetLocations.length > 0 &&
    unit.project
  ) {
    maxScore += 15;
    const projectName = unit.project.name.toLowerCase();
    const matchesLocation = preferences.targetLocations.some((loc) =>
      projectName.includes(loc.toLowerCase()),
    );
    if (matchesLocation) {
      score += 15;
    }
  }

  // Square footage matching (weight: 5)
  if (preferences.targetSqft) {
    maxScore += 5;
    if (unit.squareFeet >= preferences.targetSqft) {
      score += 5;
    } else if (unit.squareFeet >= preferences.targetSqft * 0.85) {
      // Within 85% of target
      score += 3;
    }
  }

  // Normalize to 0-100 scale, but ensure realistic ranges for demo
  // Most matched units should be 60-100, perfect matches 90+
  const rawScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  // Boost scores slightly for better visual demo (add 5-10 points)
  const boostedScore = Math.min(100, rawScore + 5);

  return boostedScore;
}