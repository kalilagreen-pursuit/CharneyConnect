import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { realtimeService, UnitStatusUpdate } from '@/lib/supabase-realtime';

interface RealtimeContextType {
  unitUpdates: Map<string, UnitStatusUpdate>;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [unitUpdates, setUnitUpdates] = useState<Map<string, UnitStatusUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

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
    <RealtimeContext.Provider value={{ unitUpdates, isConnected }}>
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
