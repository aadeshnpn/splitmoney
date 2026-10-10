import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { OCRResult } from '@/types';
import { inferCategoryFromVendor } from '@/lib/ocr';

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * OCR via Firebase callable `scanReceipt` (Vision API key stays server-side).
 * Requires: firebase deploy --only functions (+ secret GOOGLE_CLOUD_VISION_API_KEY).
 */
export async function scanReceiptImage(file: File): Promise<OCRResult & { category: string }> {
  const imageBase64 = await fileToBase64(file);
  const scanReceipt = httpsCallable<{ imageBase64: string }, OCRResult>(functions, 'scanReceipt');
  const result = await scanReceipt({ imageBase64 });
  const vendor = result.data.vendorName || '';
  return {
    ...result.data,
    vendorName: vendor || result.data.vendorName,
    category: inferCategoryFromVendor(vendor),
  };
}
