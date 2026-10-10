import { describe, it, expect } from 'vitest';
import { isSafeColumn } from '@/lib/sync';

describe('Security Audit & Vulnerability Controls', () => {
  describe('SQL Injection Column Whitelist (Sync Engine)', () => {
    it('allows valid table columns', () => {
      expect(isSafeColumn('expenses', 'title')).toBe(true);
      expect(isSafeColumn('expenses', 'total_amount')).toBe(true);
      expect(isSafeColumn('users', 'email')).toBe(true);
      expect(isSafeColumn('households', 'invite_token')).toBe(true);
    });

    it('rejects unknown or malicious column injection payloads', () => {
      expect(isSafeColumn('expenses', 'title; DROP TABLE users; --')).toBe(false);
      expect(isSafeColumn('users', 'isAdmin')).toBe(false);
      expect(isSafeColumn('expenses', '1=1')).toBe(false);
      expect(isSafeColumn('unknown_table', 'id')).toBe(false);
    });
  });
});
