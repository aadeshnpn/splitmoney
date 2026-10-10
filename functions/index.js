const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const visionApiKey = defineSecret('GOOGLE_CLOUD_VISION_API_KEY');

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

  for (const line of lines) {
    const match = line.match(/^(.*?)\s+\$?(\d+\.\d{2})$/);
    if (!match) continue;
    const description = match[1].trim();
    const lower = description.toLowerCase();
    if (
      lower.includes('total') ||
      lower.includes('subtotal') ||
      lower.includes('tax') ||
      lower.includes('tip') ||
      lower.includes('balance')
    ) {
      continue;
    }
    lineItems.push({
      description,
      amount: Math.round(parseFloat(match[2]) * 100),
    });
  }

  let total = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('total') && !lower.includes('subtotal')) {
      const match = line.match(/\$?(\d+\.\d{2})/);
      if (match) {
        total = Math.round(parseFloat(match[1]) * 100);
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

exports.scanReceipt = onCall({ secrets: [visionApiKey], cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Google sign-in is required.');
  }

  const imageBase64 = request.data?.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new HttpsError('invalid-argument', 'imageBase64 is required.');
  }

  // Reject oversized payloads (~7MB decoded ceiling for Vision)
  if (imageBase64.length > 10_000_000) {
    throw new HttpsError('invalid-argument', 'Image is too large.');
  }

  const apiKey = visionApiKey.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Vision API key is not configured.');
  }

  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const response = await fetch(visionApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new HttpsError('internal', errorData.error?.message || 'Vision API request failed.');
  }

  const data = await response.json();
  return parseVisionResponse(data);
});
