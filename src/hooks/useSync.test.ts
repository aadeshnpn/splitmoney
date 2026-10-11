// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncDatabase } from '@/lib/sync';
import { SYNC_INTERVAL_MS, useSync } from './useSync';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/hooks/useHousehold', () => ({
  useHousehold: () => ({ household: { id: 'h1' } }),
}));

vi.mock('@/lib/sync', () => ({
  syncDatabase: vi.fn(),
}));

describe('useSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(syncDatabase).mockReset();
    vi.mocked(syncDatabase).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs on mount and again on the interval, passing household and user ids', async () => {
    renderHook(() => useSync());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(syncDatabase).toHaveBeenCalledTimes(1);
    expect(syncDatabase).toHaveBeenCalledWith('h1', 'u1');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
    });

    expect(syncDatabase).toHaveBeenCalledTimes(2);
  });

  it('skips overlapping syncs while one is in flight, then syncs on the next tick', async () => {
    let release: () => void = () => {};
    vi.mocked(syncDatabase).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    const { result } = renderHook(() => useSync());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(syncDatabase).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.syncNow();
      await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
    });
    expect(syncDatabase).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
    });
    expect(syncDatabase).toHaveBeenCalledTimes(2);
  });
});
