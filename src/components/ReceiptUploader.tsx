'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { OCRResult } from '@/types';
import { scanReceiptImage } from '@/lib/ocrClient';

interface ReceiptUploaderProps {
  onOCRResult: (result: OCRResult & { category?: string }) => void;
  onImageUploaded: (url: string) => void;
  expenseId: string;
  householdId: string;
}

export default function ReceiptUploader({ onOCRResult, onImageUploaded, expenseId, householdId }: ReceiptUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSuccessNotice(null);
    setErrorNotice(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPreview(dataUrl);
        onImageUploaded(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    try {
      const ocr = await scanReceiptImage(file);
      onOCRResult(ocr);
      const label = ocr.vendorName || 'receipt';
      setSuccessNotice(`Scanned "${label}" — form fields updated.`);
    } catch (err) {
      console.error('OCR failed:', err);
      setErrorNotice('Could not read receipt text. You can still fill the form manually.');
    }

    try {
      const storageRef = ref(storage, `receipts/${householdId}/${expenseId}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onImageUploaded(url);
    } catch (error) {
      console.warn('Receipt storage upload failed; keeping local preview.', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
      {preview ? (
        <div style={{ position: 'relative', width: '100%', textAlign: 'center', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--accent)' }}>
          <img
            src={preview}
            alt="Receipt preview"
            style={{ maxWidth: '100%', maxHeight: '220px', display: 'block', margin: '0 auto', objectFit: 'contain', background: '#000' }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(15,23,42,0.95), transparent)',
              padding: '0.8rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Receipt attached</span>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setSuccessNotice(null);
                setErrorNotice(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '20px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Change photo
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInput.current?.click()}
          style={{
            width: '100%',
            padding: '1.75rem 1.25rem',
            border: '2px dashed rgba(16, 185, 129, 0.4)',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              marginBottom: '0.75rem',
            }}
          >
            📸
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
            Scan receipt
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem', textAlign: 'center' }}>
            Capture or upload a photo — we extract vendor, total, and line items
          </span>
        </div>
      )}

      <input type="file" ref={fileInput} onChange={handleFileChange} accept="image/*" capture="environment" style={{ display: 'none' }} />

      {loading && (
        <div
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Reading receipt…
        </div>
      )}
      {successNotice && (
        <div
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            borderRadius: '14px',
            color: '#10b981',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {successNotice}
        </div>
      )}
      {errorNotice && (
        <div
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid var(--warning)',
            borderRadius: '14px',
            color: 'var(--warning)',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {errorNotice}
        </div>
      )}
    </div>
  );
}
