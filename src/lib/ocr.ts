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
      const lower = description.toLowerCase();
      // Exclude total/subtotal/tax/tip lines
      if (!lower.includes('total') && !lower.includes('subtotal') && !lower.includes('tax') && !lower.includes('tip') && !lower.includes('balance')) {
        items.push({
          description,
          amount: dollarsToCents(parseFloat(priceStr)),
        });
      }
    }
  }

  return items;
}

export function parseVisionResponse(data: any): OCRResult {
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

  // Extract total amount if present
  let total: number | null = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('total') && !lower.includes('subtotal')) {
      const match = line.match(/\$?(\d+\.\d{2})/);
      if (match) {
        total = dollarsToCents(parseFloat(match[1]));
        break;
      }
    }
  }

  return {
    vendorName,
    lineItems,
    subtotal: null,
    tax: null,
    tip: null,
    total: total || (lineItems.length > 0 ? lineItems.reduce((acc, item) => acc + item.amount, 0) : null),
    rawText,
  };
}
