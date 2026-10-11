const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { parseVisionResponse } = require('./receiptParser');

initializeApp();

const visionApiKey = defineSecret('GOOGLE_CLOUD_VISION_API_KEY');

exports.parseVisionResponse = parseVisionResponse;

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
