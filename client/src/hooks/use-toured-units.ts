
import { useState, useCallback } from 'react';
import { Lead } from '@shared/schema';

export const useTouredUnits = (initialLead: Lead) => {
  const [touredUnits, setTouredUnits] = useState<string[]>(initialLead.toured_unit_ids || []);

  const addUnit = useCallback((unitId: string) => {
    setTouredUnits(prev => {
      if (!prev.includes(unitId)) {
        return [...prev, unitId];
      }
      return prev;
    });
  }, []);

  const removeUnit = useCallback((unitId: string) => {
    setTouredUnits(prev => prev.filter(id => id !== unitId));
  }, []);

  const isToured = useCallback((unitId: string) => {
    return touredUnits.includes(unitId);
  }, [touredUnits]);

  // Returns the array to be sent to the API
  const getUpdatePayload = useCallback(() => ({
    toured_unit_ids: touredUnits,
  }), [touredUnits]);

  return {
    touredUnits,
    addUnit,
    removeUnit,
    isToured,
    getUpdatePayload,
  };
};
