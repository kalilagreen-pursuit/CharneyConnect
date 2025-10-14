import { supabase } from './supabase-client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type UnitStatusUpdate = {
  id: string;
  status: string;
  updated_at: string;
};

export type RealtimeCallback = (payload: UnitStatusUpdate) => void;

class SupabaseRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToUnits(callback: RealtimeCallback): () => void {
    const channelName = 'units-realtime';

    if (this.channels.has(channelName)) {
      console.log('[Supabase Realtime] Already subscribed to units channel');
      return () => this.unsubscribe(channelName);
    }

    console.log('[Supabase Realtime] Subscribing to units table changes');

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'units',
        },
        (payload) => {
          console.log('[Supabase Realtime] Unit status changed:', payload);
          if (payload.new) {
            callback({
              id: payload.new.id as string,
              status: payload.new.status as string,
              updated_at: payload.new.updated_at as string,
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Supabase Realtime] Subscription status:', status);
        if (err) {
          console.error('[Supabase Realtime] Subscription error:', err);
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  subscribeToLeads(callback: RealtimeCallback): () => void {
    const channelName = 'leads-realtime';

    if (this.channels.has(channelName)) {
      console.log('[Supabase Realtime] Already subscribed to leads channel');
      return () => this.unsubscribe(channelName);
    }

    console.log('[Supabase Realtime] Subscribing to leads table changes');

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('[Supabase Realtime] Lead changed:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const record = payload.new as Record<string, any>;
            callback({
              id: record.id as string,
              status: record.status as string,
              updated_at: record.updated_at as string,
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Supabase Realtime] Subscription status:', status);
        if (err) {
          console.error('[Supabase Realtime] Subscription error:', err);
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  private unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`[Supabase Realtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  unsubscribeAll(): void {
    console.log('[Supabase Realtime] Unsubscribing from all channels');
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}

export const realtimeService = new SupabaseRealtimeService();