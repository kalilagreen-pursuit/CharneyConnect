import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { realtimeService, UnitStatusUpdate } from '@/lib/supabase-realtime';

interface RealtimeContextType {
  unitUpdates: Map<string, UnitStatusUpdate>;
  clearUnitUpdates: () => void;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [unitUpdates, setUnitUpdates] = useState<Map<string, UnitStatusUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const clearUnitUpdates = useCallback(() => {
    console.log('[RealtimeContext] Clearing processed unit updates');
    setUnitUpdates(new Map());
  }, []);

  useEffect(() => {
    console.log('[RealtimeContext] Initializing Supabase Realtime subscriptions');
    setIsConnected(true);

    const unsubscribeUnits = realtimeService.subscribeToUnits((update) => {
      console.log('[RealtimeContext] Received unit update:', update);
      setUnitUpdates((prev) => {
        const next = new Map(prev);
        next.set(update.id, update);
        return next;
      });
    });

    return () => {
      console.log('[RealtimeContext] Cleaning up Supabase Realtime subscriptions');
      unsubscribeUnits();
      setIsConnected(false);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ unitUpdates, clearUnitUpdates, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
