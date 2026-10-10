import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncToFirebase, syncFromFirebase } from './sync';
import { getDB, markSynced, getPendingChanges } from './db';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
  };
});

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db')>();
  return {
    ...actual,
    getDB: vi.fn(),
    getPendingChanges: vi.fn(),
    markSynced: vi.fn(),
    logChange: vi.fn(),
  };
});

describe('Sync Engine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('pushLocalChanges logic - syncs pending changes to firebase', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn(),
        step: vi.fn().mockReturnValue(true),
        getAsObject: vi.fn().mockReturnValue({ id: 'test-1', title: 'Test Expense', household_id: 'house-1' }),
        free: vi.fn(),
      }),
    };
    (getDB as any).mockResolvedValue(mockDb);

    (getPendingChanges as any).mockResolvedValue([
      { table_name: 'expenses', record_id: 'test-1', action: 'INSERT', timestamp: 123 },
    ]);

    (firestore.doc as any).mockReturnValue('docRef');
    (firestore.setDoc as any).mockResolvedValue(undefined);

    await syncToFirebase('house-1');

    expect(getDB).toHaveBeenCalled();
    expect(firestore.setDoc).toHaveBeenCalledWith(
      'docRef',
      { id: 'test-1', title: 'Test Expense', household_id: 'house-1' },
      { merge: true }
    );
    expect(markSynced).toHaveBeenCalledWith('expenses', 'test-1', 123);
  });

  it('pullRemoteChanges logic - whitelists columns and syncs from firebase to local', async () => {
    const mockDb = {
      run: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn(),
        step: vi.fn().mockReturnValue(false),
        getAsObject: vi.fn(),
        free: vi.fn(),
      }),
    };
    (getDB as any).mockResolvedValue(mockDb);
    (getPendingChanges as any).mockResolvedValue([]);

    (firestore.getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({
        id: 'house-1',
        name: 'Home',
        created_by: 'u1',
        invite_token: 'tok',
        created_at: 1,
      }),
    });

    const mockQuerySnapshot = {
      forEach: (cb: (doc: { data: () => Record<string, unknown>; id: string }) => void) => {
        cb({
          id: 'exp-1',
          data: () => ({ id: 'exp-1', title: 'Firebase Expense', total_amount: 1000, malicious_col: 'SQL_INJECTION' }),
        });
      },
    };
    (firestore.getDocs as any).mockResolvedValue(mockQuerySnapshot);
    (firestore.collection as any).mockReturnValue('collectionRef');

    await syncFromFirebase('house-1');

    // household_members + expenses + expense_splits + line_items + settlements
    expect(firestore.getDocs).toHaveBeenCalledTimes(5);
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO expenses (id, title, total_amount) VALUES (?, ?, ?)',
      ['exp-1', 'Firebase Expense', 1000]
    );
  });
});
