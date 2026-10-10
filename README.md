# SplitMoney

Split household expenses across phones. Each device keeps a local SQLite database in the browser and syncs it to Cloud Firestore. Amounts are stored as integer cents.

## Stack

- Next.js 16 (App Router) and React 19, exported as a static site
- Firebase Auth (Google), Firestore, Storage, and a Cloud Function for receipt OCR
- sql.js, persisted in IndexedDB
- Vitest for unit tests, Playwright for a smoke test

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Google sign-in uses the Firebase web config in `src/lib/firebase.ts` (project `splitmoney-70368`). Override it with:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

In development, the sign-in page exposes `window.signInAsTestUser(name?, id?)` so you can use the app without Google. That helper is off in production unless `NEXT_PUBLIC_ALLOW_TEST_AUTH=true`.

## Scripts

```bash
npx tsc --noEmit   # type-check
npm run lint
npm test           # Vitest
npm run build      # writes the static site to out/
npm run dev        # required before the Playwright smoke test
npx playwright test
```

`npm run build` does not include server routes. Receipt scanning calls the `scanReceipt` Cloud Function, not a Next.js API route.

## Firebase

Project: `splitmoney-70368` (`.firebaserc`).

```bash
npm run deploy:rules
firebase deploy --only storage
npm run deploy:functions
```

`firestore.rules` and `storage.rules` are both listed in `firebase.json`. `deploy:rules` publishes Firestore only; deploy storage separately when receipt uploads should be enforced.

`scanReceipt` reads the secret `GOOGLE_CLOUD_VISION_API_KEY` (Cloud Secret Manager). Set it before the function can read receipts:

```bash
firebase functions:secrets:set GOOGLE_CLOUD_VISION_API_KEY
```

The function sends the image to the Cloud Vision `TEXT_DETECTION` API and returns vendor, line items, subtotal, tax, tip, and total. Nothing in this repo deploys automatically.

Hosting is configured to serve the `out/` directory from `npm run build`. Add each origin you use (including a LAN IP) under Firebase Authentication → Settings → Authorized domains. `firebase.json` already lists localhost and the Firebase hosting domains.
