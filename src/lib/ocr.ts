import { OCRResult, ExpenseCategory } from '@/types';
import { dollarsToCents } from '@/lib/money';

export function inferCategoryFromVendor(vendor: string): ExpenseCategory {
  if (!vendor) return 'other';
  const v = vendor.toLowerCase();
  if (v.includes('trader') || v.includes('joe') || v.includes('whole food') || v.includes('grocer') || v.includes('market') || v.includes('safeway') || v.includes('kroger') || v.includes('costco') || v.includes('walmart') || v.includes('aldi') || v.includes('target')) return 'groceries';
  if (v.includes('starbuck') || v.includes('coffee') || v.includes('cafe') || v.includes('burger') || v.includes('pizza') || v.includes('restaurant') || v.includes('dining') || v.includes('taco') || v.includes('chipotle') || v.includes('subway') || v.includes('mcdonald')) return 'dining';
  if (v.includes('uber') || v.includes('lyft') || v.includes('gas') || v.includes('shell') || v.includes('chevron') || v.includes('transit') || v.includes('metro') || v.includes('parking') || v.includes('flight') || v.includes('airline')) return 'transport';
  if (v.includes('amazon') || v.includes('apple') || v.includes('nike') || v.includes('clothing') || v.includes('mall') || v.includes('store') || v.includes('zara')) return 'household';
  if (v.includes('rent') || v.includes('lease') || v.includes('apartment') || v.includes('landlord') || v.includes('mortgage')) return 'rent';
  if (v.includes('electric') || v.includes('water') || v.includes('power') || v.includes('internet') || v.includes('wifi') || v.includes('utility') || v.includes('gas co') || v.includes('comcast')) return 'utilities';
  if (v.includes('movie') || v.includes('cinema') || v.includes('netflix') || v.includes('spotify') || v.includes('concert') || v.includes('game') || v.includes('amc')) return 'entertainment';
  return 'other';
}

export function isReceiptSummaryLine(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes('total') ||
    lower.includes('subtotal') ||
    lower.includes('tax') ||
    lower.includes('tip') ||
    lower.includes('gratuity') ||
    lower.includes('balance')
  );
}

function lineAmountCents(line: string): number | null {
  const match = line.match(/\$?\s*(\d+\.\d{2})/);
  if (!match) return null;
  return dollarsToCents(parseFloat(match[1]));
}

type SummaryField = 'subtotal' | 'tax' | 'tip' | 'total';

function summaryField(line: string): SummaryField | null {
  const lower = line.toLowerCase();
  if (lower.includes('subtotal') || lower.includes('sub-total') || lower.includes('sub total')) return 'subtotal';
  if (/\b(tip|gratuity)\b/.test(lower)) return 'tip';
  if (lower.includes('tax')) return 'tax';
  if (lower.includes('total')) return 'total';
  return null;
}

export function extractLineItems(text: string): { description: string; amount: number }[] {
  const lines = text.split('\n');
  const items: { description: string; amount: number }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match line item pattern: text followed by dollar price at end of line (e.g. "Milk 3.49" or "Bread $2.99")
    const match = trimmed.match(/^(.*?)\s+\$?(\d+\.\d{2})$/);
    if (match) {
      const description = match[1].trim();
      const priceStr = match[2];
      if (!isReceiptSummaryLine(description)) {
        items.push({
          description,
          amount: dollarsToCents(parseFloat(priceStr)),
        });
      }
    }
  }

  return items;
}

type VisionResponse = {
  responses?: { textAnnotations?: { description?: string }[] }[];
};

export function parseVisionResponse(data: VisionResponse): OCRResult {
  const textAnnotations = data.responses?.[0]?.textAnnotations;
  if (!textAnnotations || textAnnotations.length === 0) {
    return {
      vendorName: null,
      lineItems: [],
      subtotal: null,
      tax: null,
      tip: null,
      total: null,
      rawText: '',
    };
  }

  const rawText = textAnnotations[0].description || '';
  const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const vendorName = lines.length > 0 ? lines[0] : null;

  const lineItems = extractLineItems(rawText);

  const summary: Record<SummaryField, number | null> = {
    subtotal: null,
    tax: null,
    tip: null,
    total: null,
  };

  for (const line of lines) {
    const field = summaryField(line);
    if (!field || summary[field] !== null) continue;
    const amount = lineAmountCents(line);
    if (amount === null) continue;
    summary[field] = amount;
  }

  return {
    vendorName,
    lineItems,
    subtotal: summary.subtotal,
    tax: summary.tax,
    tip: summary.tip,
    total: summary.total || (lineItems.length > 0 ? lineItems.reduce((acc, item) => acc + item.amount, 0) : null),
    rawText,
  };
}
