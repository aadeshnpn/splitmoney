import { describe, it, expect } from 'vitest';
import { isValidImageUrl } from '@/app/api/ocr/route';
import { isSafeColumn } from '@/lib/sync';

describe('Security Audit & Vulnerability Controls', () => {
  describe('SSRF & URL Validation (OCR API Route)', () => {
    it('allows valid HTTPS image URLs', () => {
      expect(isValidImageUrl('https://firebasestorage.googleapis.com/v0/b/app/o/receipt.jpg')).toBe(true);
      expect(isValidImageUrl('https://images.unsplash.com/photo-12345')).toBe(true);
    });

    it('allows base64 Data URLs', () => {
      expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')).toBe(true);
    });

    it('blocks dangerous internal IP addresses (SSRF Protection)', () => {
      expect(isValidImageUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(isValidImageUrl('https://169.254.169.254/computeMetadata/v1/')).toBe(false);
      expect(isValidImageUrl('http://localhost:8080/admin')).toBe(false);
      expect(isValidImageUrl('https://127.0.0.1/secret')).toBe(false);
      expect(isValidImageUrl('https://10.0.0.1/internal')).toBe(false);
      expect(isValidImageUrl('https://192.168.1.1/router')).toBe(false);
      expect(isValidImageUrl('http://0.0.0.0/')).toBe(false);
    });

    it('blocks non-http/https protocols', () => {
      expect(isValidImageUrl('file:///etc/passwd')).toBe(false);
      expect(isValidImageUrl('gopher://127.0.0.1:70/')).toBe(false);
      expect(isValidImageUrl('ftp://example.com/file')).toBe(false);
    });
  });

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
