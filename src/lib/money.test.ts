import { describe, it, expect } from 'vitest';
import {
  dollarsToCents,
  centsToDollars,
  formatCents,
  formatCentsRaw,
  parseMoney,
  parseDollarInput,
  splitEqual,
  splitByPercentage,
  splitByLineItems,
  validateCustomSplit,
} from './money';

describe('money.ts', () => {
  describe('dollarsToCents', () => {
    it('converts dollars to cents correctly', () => {
      expect(dollarsToCents(10.05)).toBe(1005);
      expect(dollarsToCents(10)).toBe(1000);
      expect(dollarsToCents(0.99)).toBe(99);
      expect(dollarsToCents(0.01)).toBe(1);
    });
    it('handles negative values correctly', () => {
      expect(dollarsToCents(-10.05)).toBe(-1005);
    });
  });

  describe('centsToDollars', () => {
    it('converts cents to dollars correctly', () => {
      expect(centsToDollars(1005)).toBe(10.05);
      expect(centsToDollars(1000)).toBe(10);
      expect(centsToDollars(99)).toBe(0.99);
      expect(centsToDollars(1)).toBe(0.01);
    });
  });

  describe('formatCents', () => {
    it('formats cents to USD string correctly', () => {
      // NOTE: Node's Intl format uses non-breaking spaces in some locales or environments,
      // but standard en-US currency formatting usually matches exactly.
      expect(formatCents(1005)).toBe('$10.05');
      expect(formatCents(1000)).toBe('$10.00');
      expect(formatCents(0)).toBe('$0.00');
    });
    it('handles undefined/null safely by treating it as 0', () => {
      expect(formatCents(undefined as any)).toBe('$0.00');
      expect(formatCents(null as any)).toBe('$0.00');
    });
  });

  describe('formatCentsRaw', () => {
    it('formats positive cents correctly', () => {
      expect(formatCentsRaw(1005)).toBe('10.05');
      expect(formatCentsRaw(5)).toBe('0.05');
      expect(formatCentsRaw(0)).toBe('0.00');
    });
    it('formats negative cents correctly', () => {
      expect(formatCentsRaw(-1005)).toBe('-10.05');
      expect(formatCentsRaw(-5)).toBe('-0.05');
    });
  });

  describe('parseMoney', () => {
    it('parses valid money strings to cents', () => {
      expect(parseMoney('10.05')).toBe(1005);
      expect(parseMoney('$10.05')).toBe(1005);
      expect(parseMoney('10')).toBe(1000);
      expect(parseMoney('.99')).toBe(99);
      expect(parseMoney('0.01')).toBe(1);
    });
    it('handles empty or invalid inputs', () => {
      expect(parseMoney('')).toBe(0);
      expect(parseMoney('abc')).toBe(0);
      expect(parseMoney('$')).toBe(0);
    });
  });

  describe('parseDollarInput', () => {
    it('parses valid positive dollar amounts correctly', () => {
      expect(parseDollarInput('10.05')).toBe(1005);
      expect(parseDollarInput('$ 1,000.50')).toBe(100050);
      expect(parseDollarInput('  10  ')).toBe(1000);
    });
    it('returns null for negative amounts or invalid input', () => {
      expect(parseDollarInput('-10.05')).toBeNull();
      expect(parseDollarInput('abc')).toBeNull();
      expect(parseDollarInput('')).toBeNull();
      expect(parseDollarInput('   ')).toBeNull();
    });
  });

  describe('splitEqual', () => {
    it('splits total evenly without remainder', () => {
      expect(splitEqual(1000, 2)).toEqual([500, 500]);
      expect(splitEqual(900, 3)).toEqual([300, 300, 300]);
    });
    it('handles pennies correctly by distributing remainder', () => {
      // 100 cents / 3 = 33.33...
      // Should be [34, 33, 33]
      expect(splitEqual(100, 3)).toEqual([34, 33, 33]);
      
      // 10 cents / 3 = [4, 3, 3]
      expect(splitEqual(10, 3)).toEqual([4, 3, 3]);
    });
    it('handles count of 0 or negative safely', () => {
      expect(splitEqual(100, 0)).toEqual([]);
      expect(splitEqual(100, -1)).toEqual([]);
    });
  });

  describe('splitByPercentage', () => {
    it('splits exactly according to percentages', () => {
      expect(splitByPercentage(1000, [50, 25, 25])).toEqual([500, 250, 250]);
    });
    it('distributes remainders to ensure exact sum', () => {
      // 1000 cents split [33.333, 33.333, 33.333] 
      // E.g. [33, 33, 34] assuming percentages sum to 100
      // We pass whole percentages typically, e.g. [34, 33, 33]
      // Let's test standard inputs:
      expect(splitByPercentage(100, [33.34, 33.33, 33.33])).toEqual([34, 33, 33]);
    });
  });

  describe('validateCustomSplit', () => {
    it('returns 0 if the split amounts equal the total', () => {
      expect(validateCustomSplit(1000, [500, 250, 250])).toBe(0);
    });
    it('returns the difference if the split amounts do not equal the total', () => {
      expect(validateCustomSplit(1000, [500, 250, 249])).toBe(1);
      expect(validateCustomSplit(1000, [500, 500, 1])).toBe(-1);
    });
  });

  describe('splitByLineItems', () => {
    it('splits each item equally among assignees and sums per member', () => {
      expect(
        splitByLineItems(
          [
            { amount: 1000, assignedTo: ['a', 'b'] },
            { amount: 300, assignedTo: ['a'] },
          ],
          ['a', 'b']
        )
      ).toEqual([
        { userId: 'a', amount: 800 },
        { userId: 'b', amount: 500 },
      ]);
    });

    it('distributes remainder cents across assignees', () => {
      expect(splitByLineItems([{ amount: 100, assignedTo: ['a', 'b', 'c'] }], ['a', 'b', 'c'])).toEqual([
        { userId: 'a', amount: 34 },
        { userId: 'b', amount: 33 },
        { userId: 'c', amount: 33 },
      ]);
    });
  });
});
