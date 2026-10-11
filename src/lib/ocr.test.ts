import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { parseVisionResponse as parseClientVision } from './ocr';

const nodeRequire = createRequire(import.meta.url);
const { parseVisionResponse: parseFunctionVision } = nodeRequire('../../functions/receiptParser.js') as {
  parseVisionResponse: typeof parseClientVision;
};

function vision(text: string) {
  return { responses: [{ textAnnotations: [{ description: text }] }] };
}

const parsers = [
  ['src/lib/ocr.ts', parseClientVision],
  ['functions/receiptParser.js', parseFunctionVision],
] as const;

for (const [label, parseVisionResponse] of parsers) {
describe(label, () => {
  it('returns an empty result when Vision finds no text', () => {
    expect(parseVisionResponse({})).toEqual({
      vendorName: null,
      lineItems: [],
      subtotal: null,
      tax: null,
      tip: null,
      total: null,
      rawText: '',
    });
  });

  it('extracts line items plus subtotal, tax, tip, and total', () => {
    const result = parseVisionResponse(
      vision(
        [
          "Trader Joe's",
          'Milk 3.49',
          'Bread $2.99',
          'Subtotal 6.48',
          'Tax $0.52',
          'Tip 1.00',
          'Total $8.00',
        ].join('\n')
      )
    );

    expect(result.vendorName).toBe("Trader Joe's");
    expect(result.lineItems).toEqual([
      { description: 'Milk', amount: 349 },
      { description: 'Bread', amount: 299 },
    ]);
    expect(result.subtotal).toBe(648);
    expect(result.tax).toBe(52);
    expect(result.tip).toBe(100);
    expect(result.total).toBe(800);
  });

  it('treats gratuity and total tax as summary fields, not line items', () => {
    const result = parseVisionResponse(
      vision(['Cafe', 'Coffee 9.10', 'Gratuity $2.50', 'Total Tax $0.40', 'Total $12.00'].join('\n'))
    );

    expect(result.lineItems).toEqual([{ description: 'Coffee', amount: 910 }]);
    expect(result.tip).toBe(250);
    expect(result.tax).toBe(40);
    expect(result.total).toBe(1200);
    expect(result.subtotal).toBeNull();
  });

  it('reads sub-total and sales tax labels', () => {
    const result = parseVisionResponse(
      vision(['Market', 'Eggs 4.00', 'Sub-total $4.00', 'Sales Tax 0.32', 'Total 4.32'].join('\n'))
    );

    expect(result.subtotal).toBe(400);
    expect(result.tax).toBe(32);
    expect(result.tip).toBeNull();
    expect(result.total).toBe(432);
  });

  it('keeps a subtotal from being used as the grand total and sums items when total is missing', () => {
    const result = parseVisionResponse(vision(['Shop', 'Milk 3.00', 'Bread 1.00', 'Subtotal $5.00'].join('\n')));

    expect(result.subtotal).toBe(500);
    expect(result.tax).toBeNull();
    expect(result.tip).toBeNull();
    expect(result.total).toBe(400);
    expect(result.lineItems).toEqual([
      { description: 'Milk', amount: 300 },
      { description: 'Bread', amount: 100 },
    ]);
  });
});
}
