'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncDatabase } from '@/lib/sync';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';

export const SYNC_INTERVAL_MS = 30_000;

export function useSync() {
  const { user } = useAuth();
  const { household } = useHousehold();
  const userId = user?.id;
  const householdId = household?.id;
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const inFlightRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (!userId || !householdId || inFlightRef.current) return;
    inFlightRef.current = true;
    setSyncing(true);
    try {
      await syncDatabase(householdId, userId);
      setLastSyncTime(new Date());
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      inFlightRef.current = false;
      setSyncing(false);
    }
  }, [userId, householdId]);

  useEffect(() => {
    if (!userId || !householdId) return;

    const interval = setInterval(() => {
      void syncNow();
    }, SYNC_INTERVAL_MS);
    const initial = setTimeout(() => {
      void syncNow();
    }, 0);

    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, [userId, householdId, syncNow]);

  return { syncNow, syncing, lastSyncTime };
}
