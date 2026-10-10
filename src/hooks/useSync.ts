'use client'
import { useState, useEffect, useCallback } from 'react';
import { syncDatabase } from '@/lib/sync';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';

export function useSync() {
  const { user } = useAuth();
  const { household } = useHousehold();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncNow = useCallback(async () => {
    if (!user || !household?.id || syncing) return;
    setSyncing(true);
    try {
      await syncDatabase(household.id, user.id);
      setLastSyncTime(new Date());
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setSyncing(false);
    }
  }, [user, household?.id, syncing]);

  useEffect(() => {
    if (!user || !household?.id) return;
    
    syncNow(); // initial sync
    const interval = setInterval(syncNow, 30000); // 30s periodic sync
    
    return () => clearInterval(interval);
  }, [user, household?.id]);

  return { syncNow, syncing, lastSyncTime };
}
