// All monetary values are stored as integers in cents (e.g., $12.50 → 1250)

export type SplitType = 'EQUAL' | 'CUSTOM_AMOUNT' | 'PERCENTAGE' | 'PER_ITEM';

export type ExpenseCategory =
  | 'groceries'
  | 'rent'
  | 'utilities'
  | 'dining'
  | 'transport'
  | 'healthcare'
  | 'entertainment'
  | 'household'
  | 'other';

export type HouseholdRole = 'admin' | 'member';

export interface User {
  id: string; // Firebase UID
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  householdId: string | null;
  createdAt: number; // Unix timestamp ms
}

export interface Household {
  id: string; // UUID
  name: string;
  createdBy: string; // user ID
  inviteToken: string | null;
  createdAt: number;
}

export interface HouseholdMember {
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: number;
}

export interface Expense {
  id: string; // UUID
  householdId: string;
  title: string;
  totalAmount: number; // cents
  paidBy: string; // user ID
  date: string; // ISO 8601 date string (YYYY-MM-DD)
  category: ExpenseCategory;
  receiptUrl: string | null;
  notes: string | null;
  splitType: SplitType;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: number; // 0 or 1 (soft delete for sync)
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number; // cents owed by this user
}

export interface LineItem {
  id: string;
  expenseId: string;
  description: string;
  amount: number; // cents
  assignedTo: string[] | null; // array of user IDs
}

export interface Settlement {
  id: string;
  householdId: string;
  fromUser: string; // user ID paying
  toUser: string; // user ID being paid
  amount: number; // cents
  paymentMethod: string | null;
  date: string; // ISO 8601 date
  notes: string | null;
  createdAt: number;
  isDeleted: number;
}

export interface SyncLogEntry {
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  synced: number; // 0 = pending, 1 = synced
  timestamp: number;
  // SQLite column names (snake_case) — used by raw query results
  table_name?: string;
  record_id?: string;
}

// Alias for convenience — some modules import as SyncLog
export type SyncLog = SyncLogEntry;

// UI-specific types

export interface Balance {
  fromUserId: string;
  toUserId: string;
  amount: number; // cents — fromUser owes toUser this amount
}

export interface UserBalance {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  netBalance: number; // positive = owed to them, negative = they owe
}

export interface TransactionEntry {
  id: string;
  type: 'expense' | 'settlement';
  date: string;
  title: string;
  amount: number; // cents
  paidBy: string;
  yourShare: number; // cents (for expenses)
  category?: ExpenseCategory;
}

export interface ExpenseDraft {
  title: string;
  totalAmount: number;
  date: string;
  category: ExpenseCategory;
  paidBy: string;
  notes: string;
  receiptUrl: string | null;
  splitType: SplitType;
}

export type ExpenseDraftSplit = { userId: string; amount: number };

export type ExpenseDraftLineItem = {
  description: string;
  amount: number;
  assignedTo: string[] | null;
};

export interface OCRResult {
  vendorName: string | null;
  lineItems: { description: string; amount: number }[];
  subtotal: number | null; // cents
  tax: number | null; // cents
  tip: number | null; // cents
  total: number | null; // cents
  rawText: string;
}

export const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; emoji: string }
> = {
  groceries: { label: 'Groceries', emoji: '🛒' },
  rent: { label: 'Rent', emoji: '🏠' },
  utilities: { label: 'Utilities', emoji: '⚡' },
  dining: { label: 'Dining Out', emoji: '🍽️' },
  transport: { label: 'Transport', emoji: '🚗' },
  healthcare: { label: 'Healthcare', emoji: '🏥' },
  entertainment: { label: 'Entertainment', emoji: '🎮' },
  household: { label: 'Household', emoji: '🧹' },
  other: { label: 'Other', emoji: '📦' },
};
