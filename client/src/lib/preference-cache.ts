
import { Lead } from "@shared/schema";

const CACHE_KEY_PREFIX = "lead_prefs_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedPreferences {
  data: Lead;
  timestamp: number;
}

export const preferenceCache = {
  get(leadId: string): Lead | null {
    try {
      const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${leadId}`);
      if (!cached) return null;

      const parsed: CachedPreferences = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - parsed.timestamp > CACHE_DURATION) {
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${leadId}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error("Error reading from preference cache:", error);
      return null;
    }
  },

  set(leadId: string, data: Lead): void {
    try {
      const cached: CachedPreferences = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(`${CACHE_KEY_PREFIX}${leadId}`, JSON.stringify(cached));
    } catch (error) {
      console.error("Error writing to preference cache:", error);
    }
  },

  clear(leadId?: string): void {
    if (leadId) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${leadId}`);
    } else {
      // Clear all preference caches
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    }
  },
};
