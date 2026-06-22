// ═══════════════════════════════════════════════════════════
// useRealtime — Supabase Realtime subscription hook
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Subscribe to real-time changes on a Supabase table
 * @param {string} table - Table name
 * @param {string} event - Event type: INSERT, UPDATE, DELETE, or *
 * @param {function} callback - Called with payload on change
 * @param {object} filter - Optional filter { column, value }
 */
export function useRealtime(table, event = '*', callback, filter = null) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!supabase) return;

    let channel = supabase.channel(`${table}-changes`);

    const config = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      config.filter = `${filter.column}=eq.${filter.value}`;
    }

    channel = channel.on('postgres_changes', config, (payload) => {
      callbackRef.current(payload);
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter?.column, filter?.value]);
}

/**
 * Subscribe to multiple tables
 */
export function useRealtimeMulti(subscriptions) {
  const subsRef = useRef(subscriptions);
  subsRef.current = subscriptions;

  useEffect(() => {
    if (!supabase || !subsRef.current?.length) return;

    const channels = subsRef.current.map((sub, i) => {
      const channel = supabase
        .channel(`multi-${sub.table}-${i}`)
        .on('postgres_changes', {
          event: sub.event || '*',
          schema: 'public',
          table: sub.table,
          ...(sub.filter ? { filter: `${sub.filter.column}=eq.${sub.filter.value}` } : {}),
        }, (payload) => {
          sub.callback(payload);
        })
        .subscribe();
      return channel;
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);
}

export { supabase };
