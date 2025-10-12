
import { Lead, UnitWithDetails } from "@shared/schema";

interface MatchResult {
  isMatch: boolean;
  score: number;
  reason: string;
}

/**
 * Match a unit against client preferences
 * Returns match status, score, and reason
 */
export const matchUnitToClient = (unit: UnitWithDetails, client: Lead): MatchResult => {
  let matchScore = 0;
  let reason = "Good Match";
  
  // 1. Price Check
  const unitPrice = typeof unit.price === 'string' ? parseFloat(unit.price) : unit.price;
  const maxPrice = client.targetPriceMax ? parseFloat(client.targetPriceMax.toString()) : Infinity;
  const minPrice = client.targetPriceMin ? parseFloat(client.targetPriceMin.toString()) : 0;
  
  if (unitPrice > maxPrice) {
    reason = "Price exceeds max budget.";
    return { isMatch: false, score: 0, reason };
  }
  
  if (unitPrice < minPrice) {
    reason = "Price below minimum budget.";
    return { isMatch: false, score: 0, reason };
  }
  matchScore += 1;
  
  // 2. Bedroom Check
  if (client.targetBedrooms) {
    if (unit.bedrooms < client.targetBedrooms) {
      reason = "Fewer bedrooms than required.";
      return { isMatch: false, score: 0, reason };
    }
    matchScore += 1;
  }

  // 3. View Check (if unit has views and client has desired views)
  if (client.desiredViews && client.desiredViews.length > 0 && unit.floorPlan) {
    // Note: You'll need to add views to the unit schema if not present
    // For now, this is a placeholder for when views are available
    matchScore += 2; // Higher weight for view
  }

  // 4. Square Footage Check
  if (client.targetSqftMin || client.targetSqftMax) {
    const minSqft = client.targetSqftMin || 0;
    const maxSqft = client.targetSqftMax || Infinity;
    
    if (unit.squareFeet >= minSqft && unit.squareFeet <= maxSqft) {
      matchScore += 1;
    }
  }

  // 5. Bathrooms Check
  if (client.targetBathrooms) {
    const unitBaths = typeof unit.bathrooms === 'string' ? parseFloat(unit.bathrooms) : unit.bathrooms;
    const targetBaths = typeof client.targetBathrooms === 'string' ? parseFloat(client.targetBathrooms.toString()) : client.targetBathrooms;
    
    if (unitBaths >= targetBaths) {
      matchScore += 1;
    }
  }

  // 6. Location Check
  if (client.targetLocations && client.targetLocations.length > 0) {
    if (client.targetLocations.includes(unit.building)) {
      matchScore += 2; // Higher weight for preferred location
    }
  }

  // Determine match quality
  if (matchScore >= 5) {
    reason = "Perfect Match: Meets all key criteria.";
  } else if (matchScore >= 3) {
    reason = "Strong Match: Meets most criteria.";
  } else if (matchScore >= 1) {
    reason = "Good Match: Meets basic criteria.";
  }

  return { isMatch: true, score: matchScore, reason };
};

/**
 * Filter and sort units by match quality
 */
export const getMatchedUnits = (
  units: UnitWithDetails[],
  client: Lead
): Array<UnitWithDetails & { matchResult: MatchResult }> => {
  return units
    .map(unit => ({
      ...unit,
      matchResult: matchUnitToClient(unit, client)
    }))
    .filter(item => item.matchResult.isMatch)
    .sort((a, b) => b.matchResult.score - a.matchResult.score);
};
