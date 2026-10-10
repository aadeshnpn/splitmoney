import initSqlJs, { Database, SqlValue } from 'sql.js';
import { User, Household, HouseholdMember, Expense, ExpenseSplit, LineItem, Settlement, SyncLog } from '@/types';

const DB_KEY = 'splitmoney_sqlite_db';
const STORE_NAME = 'sqlite_store';
const IDB_NAME = 'splitmoney_idb';

let dbInstance: Database | null = null;
let sqlPromise: Promise<any> | null = null;


function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj;
}

function cleanParams(params: any[]): SqlValue[] {
  return params.map(p => (p === undefined ? null : p)) as SqlValue[];
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DB_KEY);
      request.onsuccess = () => {
        if (request.result) {
          resolve(new Uint8Array(request.result));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to load DB from IndexedDB', e);
    return null;
  }
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data.buffer, DB_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save DB to IndexedDB', e);
  }
}

export async function getDB(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (typeof window === 'undefined') {
    throw new Error('Database can only be initialized in the browser.');
  }

  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: file => `/${file}`
    });
  }

  const SQL = await sqlPromise;
  const savedData = await loadFromIDB();

  const instance = savedData ? new SQL.Database(savedData) : new SQL.Database();
  if (!savedData) {
    runSchema(instance);
  }
  dbInstance = instance;
  if (!savedData) {
    await saveDB();
  }

  return instance;
}

export async function saveDB(): Promise<void> {
  if (!dbInstance) return;
  const binaryData = dbInstance.export();
  await saveToIDB(binaryData);
}

function runSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      household_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      invite_token TEXT UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS household_members (
      household_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (household_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      title TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      paid_by TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      receipt_url TEXT,
      notes TEXT,
      split_type TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      UNIQUE(expense_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS line_items (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL,
      assigned_to TEXT
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      from_user TEXT NOT NULL,
      to_user TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT,
      date TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      timestamp INTEGER NOT NULL,
      PRIMARY KEY (table_name, record_id, timestamp)
    );
  `);
}

// Sync Log Helpers
export async function logChange(tableName: string, recordId: string, action: 'INSERT' | 'UPDATE' | 'DELETE') {
  const db = await getDB();
  db.run(
    `INSERT INTO sync_log (table_name, record_id, action, timestamp) VALUES (?, ?, ?, ?)`,
    cleanParams([tableName, recordId, action, Date.now()])
  );
  await saveDB();
}

export async function getPendingChanges(): Promise<SyncLog[]> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM sync_log WHERE synced = 0 ORDER BY timestamp ASC`);
  const logs: SyncLog[] = [];
  while (stmt.step()) {
    logs.push(toCamelCase(stmt.getAsObject()) as unknown as SyncLog);
  }
  stmt.free();
  return logs;
}

export async function markSynced(tableName: string, recordId: string, timestamp: number) {
  const db = await getDB();
  db.run(
    `UPDATE sync_log SET synced = 1 WHERE table_name = ? AND record_id = ? AND timestamp = ?`,
    cleanParams([tableName, recordId, timestamp])
  );
  await saveDB();
}

// Users
export async function upsertUser(user: User) {
  const db = await getDB();
  const createdAt = user.createdAt || Date.now();
  db.run(
    `INSERT INTO users (id, email, display_name, avatar_url, household_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
     email=excluded.email, display_name=excluded.display_name, avatar_url=excluded.avatar_url, household_id=excluded.household_id`,
    cleanParams([user.id, user.email ?? '', user.displayName ?? 'User', user.avatarUrl ?? null, user.householdId ?? null, createdAt])
  );
  await logChange('users', user.id, 'UPDATE');
}

export async function getUser(id: string): Promise<User | null> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  stmt.bind(cleanParams([id]));
  const user = stmt.step() ? (toCamelCase(stmt.getAsObject()) as unknown as User) : null;
  stmt.free();
  return user;
}

export async function getUsersByHousehold(householdId: string): Promise<User[]> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM users WHERE household_id = ?`);
  stmt.bind(cleanParams([householdId]));
  const users: User[] = [];
  while (stmt.step()) {
    users.push(toCamelCase(stmt.getAsObject()) as unknown as User);
  }
  stmt.free();
  return users;
}

// Households
export async function createHousehold(h: Household) {
  const db = await getDB();
  const createdAt = h.createdAt || Date.now();
  db.run(
    `INSERT INTO households (id, name, created_by, invite_token, created_at) VALUES (?, ?, ?, ?, ?)`,
    cleanParams([h.id, h.name, h.createdBy, h.inviteToken, createdAt])
  );
  await logChange('households', h.id, 'INSERT');
}

export async function getHousehold(id: string): Promise<Household | null> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM households WHERE id = ?`);
  stmt.bind(cleanParams([id]));
  const h = stmt.step() ? (toCamelCase(stmt.getAsObject()) as unknown as Household) : null;
  stmt.free();
  return h;
}

export async function getHouseholdByInviteToken(token: string): Promise<Household | null> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM households WHERE invite_token = ?`);
  stmt.bind(cleanParams([token]));
  const h = stmt.step() ? (toCamelCase(stmt.getAsObject()) as unknown as Household) : null;
  stmt.free();
  return h;
}

export async function getUserHouseholds(userId: string): Promise<Household[]> {
  const db = await getDB();
  const stmt = db.prepare(`
    SELECT h.* FROM households h
    JOIN household_members hm ON h.id = hm.household_id
    WHERE hm.user_id = ?
    ORDER BY hm.joined_at DESC
  `);
  stmt.bind(cleanParams([userId]));
  const households: Household[] = [];
  while (stmt.step()) {
    households.push(toCamelCase(stmt.getAsObject()) as unknown as Household);
  }
  stmt.free();
  return households;
}

// Household Members
export async function addMember(m: HouseholdMember) {
  const db = await getDB();
  const joinedAt = m.joinedAt || Date.now();
  db.run(
    `INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(household_id, user_id) DO UPDATE SET role=excluded.role`,
    cleanParams([m.householdId, m.userId, m.role ?? 'member', joinedAt])
  );
  await logChange('household_members', `${m.householdId}_${m.userId}`, 'INSERT');
}

export async function getMembers(householdId: string): Promise<HouseholdMember[]> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM household_members WHERE household_id = ?`);
  stmt.bind(cleanParams([householdId]));
  const members: HouseholdMember[] = [];
  while (stmt.step()) {
    members.push(toCamelCase(stmt.getAsObject()) as unknown as HouseholdMember);
  }
  stmt.free();
  return members;
}

export async function removeMember(householdId: string, userId: string) {
  const db = await getDB();
  db.run(`DELETE FROM household_members WHERE household_id = ? AND user_id = ?`, cleanParams([householdId, userId]));
  await logChange('household_members', `${householdId}_${userId}`, 'DELETE');
}

export async function updateMemberRole(householdId: string, userId: string, role: string) {
  const db = await getDB();
  db.run(`UPDATE household_members SET role = ? WHERE household_id = ? AND user_id = ?`, cleanParams([role, householdId, userId]));
  await logChange('household_members', `${householdId}_${userId}`, 'UPDATE');
}

export async function getMemberRole(householdId: string, userId: string): Promise<string | null> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT role FROM household_members WHERE household_id = ? AND user_id = ?`);
  stmt.bind(cleanParams([householdId, userId]));
  const result = stmt.step() ? toCamelCase(stmt.getAsObject()) : null;
  stmt.free();
  return result ? (result.role as string) : null;
}

// Expenses
export async function createExpense(e: Expense) {
  const db = await getDB();
  db.run(
    `INSERT INTO expenses (id, household_id, title, total_amount, paid_by, date, category, receipt_url, notes, split_type, created_by, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    cleanParams([e.id, e.householdId, e.title, e.totalAmount, e.paidBy, e.date, e.category, e.receiptUrl, e.notes, e.splitType, e.createdBy, e.createdAt, e.updatedAt])
  );
  await logChange('expenses', e.id, 'INSERT');
}

export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM expenses WHERE id = ? AND is_deleted = 0`);
  stmt.bind(cleanParams([id]));
  const e = stmt.step() ? (toCamelCase(stmt.getAsObject()) as unknown as Expense) : null;
  stmt.free();
  return e;
}

export async function getExpensesByHousehold(
  householdId: string,
  opts?: { category?: string; dateFrom?: string; dateTo?: string; search?: string }
): Promise<Expense[]> {
  const db = await getDB();
  let query = `SELECT * FROM expenses WHERE household_id = ? AND is_deleted = 0`;
  const params: any[] = [householdId];

  if (opts?.category) {
    query += ` AND category = ?`;
    params.push(opts.category);
  }
  if (opts?.dateFrom) {
    query += ` AND date >= ?`;
    params.push(opts.dateFrom);
  }
  if (opts?.dateTo) {
    query += ` AND date <= ?`;
    params.push(opts.dateTo);
  }
  if (opts?.search) {
    query += ` AND (title LIKE ? OR notes LIKE ?)`;
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  query += ` ORDER BY date DESC`;

  const stmt = db.prepare(query);
  stmt.bind(cleanParams(params));
  const expenses: Expense[] = [];
  while (stmt.step()) {
    expenses.push(toCamelCase(stmt.getAsObject()) as unknown as Expense);
  }
  stmt.free();
  return expenses;
}

export async function updateExpense(e: Expense) {
  const db = await getDB();
  db.run(
    `UPDATE expenses SET
     title = ?, total_amount = ?, paid_by = ?, date = ?, category = ?, receipt_url = ?, notes = ?, split_type = ?, updated_at = ?
     WHERE id = ?`,
    cleanParams([e.title, e.totalAmount, e.paidBy, e.date, e.category, e.receiptUrl, e.notes, e.splitType, e.updatedAt, e.id])
  );
  await logChange('expenses', e.id, 'UPDATE');
}

export async function softDeleteExpense(id: string) {
  const db = await getDB();
  const updatedAt = Date.now();
  db.run(`UPDATE expenses SET is_deleted = 1, updated_at = ? WHERE id = ?`, cleanParams([updatedAt, id]));
  await logChange('expenses', id, 'UPDATE');
}

// Expense Splits
export async function createSplits(splits: ExpenseSplit[]) {
  const db = await getDB();
  for (const s of splits) {
    db.run(
      `INSERT INTO expense_splits (id, expense_id, user_id, amount) VALUES (?, ?, ?, ?)`,
      cleanParams([s.id, s.expenseId, s.userId, s.amount])
    );
    await logChange('expense_splits', s.id, 'INSERT');
  }
}

export async function deleteSplitsByExpense(expenseId: string) {
  const db = await getDB();
  const existing = await getSplitsByExpense(expenseId);
  db.run(`DELETE FROM expense_splits WHERE expense_id = ?`, cleanParams([expenseId]));
  for (const s of existing) {
    await logChange('expense_splits', s.id, 'DELETE');
  }
}

export async function replaceSplits(expenseId: string, splits: ExpenseSplit[]) {
  await deleteSplitsByExpense(expenseId);
  await createSplits(splits);
}

export async function getSplitsByExpense(expenseId: string): Promise<ExpenseSplit[]> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM expense_splits WHERE expense_id = ?`);
  stmt.bind(cleanParams([expenseId]));
  const splits: ExpenseSplit[] = [];
  while (stmt.step()) {
    splits.push(toCamelCase(stmt.getAsObject()) as unknown as ExpenseSplit);
  }
  stmt.free();
  return splits;
}

export async function getSplitsByUser(userId: string, householdId: string): Promise<ExpenseSplit[]> {
  const db = await getDB();
  const stmt = db.prepare(`
    SELECT s.* FROM expense_splits s
    JOIN expenses e ON s.expense_id = e.id
    WHERE s.user_id = ? AND e.household_id = ? AND e.is_deleted = 0
  `);
  stmt.bind(cleanParams([userId, householdId]));
  const splits: ExpenseSplit[] = [];
  while (stmt.step()) {
    splits.push(toCamelCase(stmt.getAsObject()) as unknown as ExpenseSplit);
  }
  stmt.free();
  return splits;
}

// Line Items
export async function createLineItems(items: LineItem[]) {
  const db = await getDB();
  for (const i of items) {
    db.run(
      `INSERT INTO line_items (id, expense_id, description, amount, assigned_to) VALUES (?, ?, ?, ?, ?)`,
      cleanParams([i.id, i.expenseId, i.description, i.amount, i.assignedTo ? JSON.stringify(i.assignedTo) : null])
    );
    await logChange('line_items', i.id, 'INSERT');
  }
}

function parseAssignedTo(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function deleteLineItemsByExpense(expenseId: string) {
  const db = await getDB();
  const existing = await getLineItemsByExpense(expenseId);
  db.run(`DELETE FROM line_items WHERE expense_id = ?`, cleanParams([expenseId]));
  for (const item of existing) {
    await logChange('line_items', item.id, 'DELETE');
  }
}

export async function replaceLineItems(expenseId: string, items: LineItem[]) {
  await deleteLineItemsByExpense(expenseId);
  await createLineItems(items);
}

export async function getLineItemsByExpense(expenseId: string): Promise<LineItem[]> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM line_items WHERE expense_id = ?`);
  stmt.bind(cleanParams([expenseId]));
  const items: LineItem[] = [];
  while (stmt.step()) {
    const raw = toCamelCase(stmt.getAsObject()) as unknown as LineItem & { assignedTo?: unknown };
    items.push({
      ...raw,
      assignedTo: parseAssignedTo(raw.assignedTo),
    });
  }
  stmt.free();
  return items;
}

// Settlements
export async function createSettlement(s: Settlement) {
  const db = await getDB();
  db.run(
    `INSERT INTO settlements (id, household_id, from_user, to_user, amount, payment_method, date, notes, created_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    cleanParams([s.id, s.householdId, s.fromUser, s.toUser, s.amount, s.paymentMethod, s.date, s.notes, s.createdAt])
  );
  await logChange('settlements', s.id, 'INSERT');
}

export async function getSettlementsByHousehold(householdId: string): Promise<Settlement[]> {
  const db = await getDB();
  const stmt = db.prepare(`SELECT * FROM settlements WHERE household_id = ? AND is_deleted = 0 ORDER BY date DESC`);
  stmt.bind(cleanParams([householdId]));
  const settlements: Settlement[] = [];
  while (stmt.step()) {
    settlements.push(toCamelCase(stmt.getAsObject()) as unknown as Settlement);
  }
  stmt.free();
  return settlements;
}

export async function softDeleteSettlement(id: string) {
  const db = await getDB();
  db.run(`UPDATE settlements SET is_deleted = 1 WHERE id = ?`, cleanParams([id]));
  await logChange('settlements', id, 'UPDATE');
}

// Additional helpers for component compatibility
export async function getHouseholdMembersWithUsers(householdId: string) {
  const members = await getMembers(householdId);
  const users = await getUsersByHousehold(householdId);
  const userMap = new Map(users.map((u) => [u.id, u]));
  return members.map((m) => ({
    ...m,
    user: userMap.get(m.userId) || {
      id: m.userId,
      email: '',
      displayName: 'Member',
      avatarUrl: null,
      householdId: m.householdId,
      createdAt: m.joinedAt,
    },
  }));
}

export async function updateUserHousehold(userId: string, householdId: string | null) {
  const user = await getUser(userId);
  if (user) {
    user.householdId = householdId;
    await upsertUser(user);
  }
}

export async function updateHouseholdToken(householdId: string, inviteToken: string) {
  const instance = await getDB();
  instance.run(`UPDATE households SET invite_token = ? WHERE id = ?`, cleanParams([inviteToken, householdId]));
  await logChange('households', householdId, 'UPDATE');
}

export const getHouseholdByToken = getHouseholdByInviteToken;
export const addHouseholdMember = addMember;
export const removeHouseholdMember = removeMember;
export const createUser = upsertUser;
export const updateUser = upsertUser;

export const db = {
  getDB,
  logChange,
  getPendingChanges,
  markSynced,
  upsertUser,
  createUser,
  updateUser,
  getUser,
  getUsersByHousehold,
  createHousehold,
  getHousehold,
  getUserHouseholds,
  getHouseholdByInviteToken,
  getHouseholdByToken,
  addMember,
  addHouseholdMember,
  getMembers,
  removeMember,
  removeHouseholdMember,
  updateMemberRole,
  getMemberRole,
  getHouseholdMembersWithUsers,
  updateUserHousehold,
  updateHouseholdToken,
  createExpense,
  getExpense,
  getExpensesByHousehold,
  updateExpense,
  softDeleteExpense,
  createSplits,
  replaceSplits,
  deleteSplitsByExpense,
  getSplitsByExpense,
  getSplitsByUser,
  createLineItems,
  replaceLineItems,
  deleteLineItemsByExpense,
  getLineItemsByExpense,
  createSettlement,
  getSettlementsByHousehold,
  softDeleteSettlement,
};

export default db;

if (typeof window !== 'undefined') {
  (window as any).db = db;
}
