import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db as firebaseDB } from '@/lib/firebase';
import { getDB, getPendingChanges, markSynced } from '@/lib/db';
import { Household } from '@/types';

const TABLE_ALLOWED_COLUMNS: Record<string, Set<string>> = {
  users: new Set(['id', 'email', 'display_name', 'avatar_url', 'household_id', 'created_at']),
  households: new Set(['id', 'name', 'created_by', 'invite_token', 'created_at']),
  household_members: new Set(['household_id', 'user_id', 'role', 'joined_at']),
  expenses: new Set([
    'id',
    'household_id',
    'title',
    'total_amount',
    'paid_by',
    'date',
    'category',
    'receipt_url',
    'notes',
    'split_type',
    'created_by',
    'created_at',
    'updated_at',
    'is_deleted',
  ]),
  expense_splits: new Set(['id', 'expense_id', 'user_id', 'amount']),
  line_items: new Set(['id', 'expense_id', 'description', 'amount', 'assigned_to']),
  settlements: new Set([
    'id',
    'household_id',
    'from_user',
    'to_user',
    'amount',
    'payment_method',
    'date',
    'notes',
    'created_at',
    'is_deleted',
  ]),
};

export function isSafeColumn(tableName: string, colName: string): boolean {
  return TABLE_ALLOWED_COLUMNS[tableName]?.has(colName) ?? false;
}

function firestoreDocId(tableName: string, recordId: string): string {
  if (tableName === 'household_members') {
    const parts = recordId.split('_');
    return parts[parts.length - 1] || recordId;
  }
  return recordId;
}

async function upsertInviteDoc(household: {
  id: string;
  name: string;
  created_by?: string;
  createdBy?: string;
  invite_token?: string | null;
  inviteToken?: string | null;
}) {
  const token = household.invite_token || household.inviteToken;
  if (!token) return;
  const createdBy = household.created_by || household.createdBy || '';
  await setDoc(doc(firebaseDB, 'invites', String(token)), {
    household_id: household.id,
    name: household.name,
    created_by: createdBy,
    invite_token: token,
    created_at: Date.now(),
  });
}

/**
 * Look up a household by invite token via the invites collection (no household listing).
 */
export async function findHouseholdByInviteTokenRemote(token: string): Promise<Household | null> {
  const inviteSnap = await getDoc(doc(firebaseDB, 'invites', token));
  if (!inviteSnap.exists()) return null;

  const data = inviteSnap.data();
  const household: Household = {
    id: String(data.household_id || ''),
    name: String(data.name || 'Household'),
    createdBy: String(data.created_by || ''),
    inviteToken: String(data.invite_token || token),
    createdAt: Number(data.created_at || Date.now()),
  };
  if (!household.id) return null;

  const localDb = await getDB();
  localDb.run(
    `INSERT OR REPLACE INTO households (id, name, created_by, invite_token, created_at) VALUES (?, ?, ?, ?, ?)`,
    [household.id, household.name, household.createdBy, household.inviteToken, household.createdAt]
  );

  return household;
}

/**
 * Pushes pending local changes from SQLite to Firebase Firestore.
 */
export async function syncToFirebase(householdId: string) {
  try {
    const localDb = await getDB();
    const pendingChanges = await getPendingChanges();
    if (pendingChanges.length === 0) return;

    for (const change of pendingChanges) {
      const tableName = change.table_name || change.tableName;
      const recordId = change.record_id || change.recordId;
      if (!tableName || !recordId) continue;

      // Only push rows that belong to this household (or global users/households docs)
      if (tableName !== 'users' && tableName !== 'households') {
        if (tableName === 'household_members') {
          if (!recordId.startsWith(`${householdId}_`)) continue;
        } else if (tableName === 'expense_splits' || tableName === 'line_items') {
          // verified via joined expense below after load
        } else {
          // expenses / settlements — check household_id after load
        }
      }

      let collectionPath = `households/${householdId}/${tableName}`;
      if (tableName === 'users') {
        collectionPath = 'users';
      } else if (tableName === 'households') {
        collectionPath = 'households';
        if (recordId !== householdId) continue;
      }

      let stmt;
      if (tableName === 'household_members') {
        const [hId, uId] = recordId.split('_');
        stmt = localDb.prepare(`SELECT * FROM ${tableName} WHERE household_id = ? AND user_id = ?`);
        stmt.bind([hId, uId]);
      } else {
        stmt = localDb.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
        stmt.bind([recordId]);
      }

      const hasRecord = stmt.step();
      let recordData: Record<string, unknown> | null = null;
      if (hasRecord) {
        recordData = stmt.getAsObject() as Record<string, unknown>;
      }
      stmt.free();

      if (recordData && (tableName === 'expenses' || tableName === 'settlements')) {
        if (String(recordData.household_id) !== householdId) continue;
      }

      if (recordData && (tableName === 'expense_splits' || tableName === 'line_items')) {
        const expenseId = String(recordData.expense_id || '');
        const expStmt = localDb.prepare(`SELECT household_id FROM expenses WHERE id = ?`);
        expStmt.bind([expenseId]);
        const hasExp = expStmt.step();
        const expRow = hasExp ? (expStmt.getAsObject() as { household_id?: string }) : null;
        expStmt.free();
        if (!expRow || String(expRow.household_id) !== householdId) continue;
      }

      const docRef = doc(firebaseDB, collectionPath, firestoreDocId(tableName, recordId));

      if (change.action === 'DELETE') {
        if (tableName === 'household_members' || tableName === 'expense_splits' || tableName === 'line_items') {
          await deleteDoc(docRef);
        } else if (!recordData) {
          await setDoc(docRef, { is_deleted: 1, updated_at: Date.now() }, { merge: true });
        } else {
          await setDoc(docRef, recordData, { merge: true });
        }
      } else if (recordData) {
        await setDoc(docRef, recordData, { merge: true });
        if (tableName === 'households') {
          await upsertInviteDoc(recordData as any);
        }
      }

      await markSynced(tableName, recordId, change.timestamp);
    }
  } catch (error) {
    console.error('Error syncing to Firebase:', error);
  }
}

function upsertFirestoreRow(localDb: Awaited<ReturnType<typeof getDB>>, colName: string, data: Record<string, unknown>) {
  const allowedCols = TABLE_ALLOWED_COLUMNS[colName];
  if (!allowedCols) return;

  const safeKeys = Object.keys(data).filter((k) => allowedCols.has(k));
  if (safeKeys.length === 0) return;

  const placeholders = safeKeys.map(() => '?').join(', ');
  const values = safeKeys.map((k) => data[k]);
  const sql = `INSERT OR REPLACE INTO ${colName} (${safeKeys.join(', ')}) VALUES (${placeholders})`;
  localDb.run(sql, values as any[]);
}

function collectLocalIds(
  localDb: Awaited<ReturnType<typeof getDB>>,
  sql: string,
  params: unknown[]
): string[] {
  const stmt = localDb.prepare(sql);
  stmt.bind(params as any[]);
  const ids: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id?: string; user_id?: string };
    if (row.id) ids.push(String(row.id));
    else if (row.user_id) ids.push(String(row.user_id));
  }
  stmt.free();
  return ids;
}

/**
 * Pulls changes from Firebase Firestore into local SQLite.
 * Removes local members/splits/line items that no longer exist remotely.
 */
export async function syncFromFirebase(householdId: string) {
  try {
    const localDb = await getDB();

    const householdRef = doc(firebaseDB, 'households', householdId);
    const householdSnap = await getDoc(householdRef);
    if (householdSnap.exists()) {
      const data = householdSnap.data();
      upsertFirestoreRow(localDb, 'households', {
        id: data.id || householdId,
        name: data.name,
        created_by: data.created_by ?? data.createdBy,
        invite_token: data.invite_token ?? data.inviteToken,
        created_at: data.created_at ?? data.createdAt,
      });
    }

    const memberUserIds: string[] = [];
    const remoteMemberIds = new Set<string>();
    const remoteSplitIds = new Set<string>();
    const remoteLineItemIds = new Set<string>();

    const collectionsToSync = [
      'household_members',
      'expenses',
      'expense_splits',
      'line_items',
      'settlements',
    ] as const;

    for (const colName of collectionsToSync) {
      const q = collection(firebaseDB, `households/${householdId}/${colName}`);
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;

        if (colName === 'household_members') {
          const userId = String(data.user_id || data.userId || docSnap.id);
          const row = {
            household_id: data.household_id || data.householdId || householdId,
            user_id: userId,
            role: data.role || 'member',
            joined_at: data.joined_at || data.joinedAt || Date.now(),
          };
          upsertFirestoreRow(localDb, colName, row);
          memberUserIds.push(userId);
          remoteMemberIds.add(userId);
          return;
        }

        if (colName === 'expense_splits') {
          remoteSplitIds.add(String(data.id || docSnap.id));
        }
        if (colName === 'line_items') {
          remoteLineItemIds.add(String(data.id || docSnap.id));
        }

        upsertFirestoreRow(localDb, colName, {
          ...data,
          id: data.id || docSnap.id,
        });
      });
    }

    // Tombstone local rows removed remotely — never delete pending local inserts
    const pending = await getPendingChanges();
    const pendingIds = new Set(
      pending
        .filter((p) => {
          const action = p.action;
          const table = p.table_name || p.tableName;
          return action !== 'DELETE' && !!table;
        })
        .map((p) => `${p.table_name || p.tableName}:${p.record_id || p.recordId}`)
    );

    const localMembers = collectLocalIds(
      localDb,
      `SELECT user_id FROM household_members WHERE household_id = ?`,
      [householdId]
    );
    for (const userId of localMembers) {
      const pendingKey = `household_members:${householdId}_${userId}`;
      if (!remoteMemberIds.has(userId) && !pendingIds.has(pendingKey)) {
        localDb.run(`DELETE FROM household_members WHERE household_id = ? AND user_id = ?`, [householdId, userId]);
      }
    }

    const localSplits = collectLocalIds(
      localDb,
      `SELECT s.id FROM expense_splits s
       JOIN expenses e ON e.id = s.expense_id
       WHERE e.household_id = ?`,
      [householdId]
    );
    for (const id of localSplits) {
      if (!remoteSplitIds.has(id) && !pendingIds.has(`expense_splits:${id}`)) {
        localDb.run(`DELETE FROM expense_splits WHERE id = ?`, [id]);
      }
    }

    const localLineItems = collectLocalIds(
      localDb,
      `SELECT li.id FROM line_items li
       JOIN expenses e ON e.id = li.expense_id
       WHERE e.household_id = ?`,
      [householdId]
    );
    for (const id of localLineItems) {
      if (!remoteLineItemIds.has(id) && !pendingIds.has(`line_items:${id}`)) {
        localDb.run(`DELETE FROM line_items WHERE id = ?`, [id]);
      }
    }

    for (const userId of [...new Set(memberUserIds)]) {
      const userSnap = await getDoc(doc(firebaseDB, 'users', userId));
      if (userSnap.exists()) {
        const data = userSnap.data() as Record<string, unknown>;
        upsertFirestoreRow(localDb, 'users', {
          id: data.id || userId,
          email: data.email,
          display_name: data.display_name ?? data.displayName,
          avatar_url: data.avatar_url ?? data.avatarUrl,
          household_id: data.household_id ?? data.householdId,
          created_at: data.created_at ?? data.createdAt,
        });
      }
    }
  } catch (error) {
    console.error('Error syncing from Firebase:', error);
  }
}

/**
 * Performs a full bidirectional sync.
 */
export async function fullSync(householdId: string) {
  await syncToFirebase(householdId);
  await syncFromFirebase(householdId);
}

export const syncDatabase = async (householdId: string, _userId?: string) => {
  return fullSync(householdId);
};

/**
 * Starts periodic sync and returns a cleanup interval function.
 */
export function startPeriodicSync(householdId: string, intervalMs: number = 5 * 60 * 1000) {
  const intervalId = setInterval(() => {
    fullSync(householdId);
  }, intervalMs);

  return () => clearInterval(intervalId);
}
