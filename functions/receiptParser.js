function lineAmountCents(line) {
  const match = line.match(/\$?\s*(\d+\.\d{2})/);
  if (!match) return null;
  return Math.round(parseFloat(match[1]) * 100);
}

function isReceiptSummaryLine(description) {
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

function summaryField(line) {
  const lower = line.toLowerCase();
  if (lower.includes('subtotal') || lower.includes('sub-total') || lower.includes('sub total')) return 'subtotal';
  if (/\b(tip|gratuity)\b/.test(lower)) return 'tip';
  if (lower.includes('tax')) return 'tax';
  if (lower.includes('total')) return 'total';
  return null;
}

function parseVisionResponse(data) {
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
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const vendorName = lines.length > 0 ? lines[0] : null;
  const lineItems = [];
  const summary = { subtotal: null, tax: null, tip: null, total: null };

  for (const line of lines) {
    const match = line.match(/^(.*?)\s+\$?(\d+\.\d{2})$/);
    if (match) {
      const description = match[1].trim();
      if (!isReceiptSummaryLine(description)) {
        lineItems.push({
          description,
          amount: Math.round(parseFloat(match[2]) * 100),
        });
      }
    }

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

module.exports = { parseVisionResponse };
