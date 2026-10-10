import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDZZz588zOa1rAmOrCi3lOcJSpFwH3xMPw',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'splitmoney-70368.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'splitmoney-70368',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'splitmoney-70368.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '530814078104',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:530814078104:web:793a97f707e53b8e8fd4ed',
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

export const app = getFirebaseApp();

let authInstance: Auth;
let firestoreInstance: Firestore;
let storageInstance: FirebaseStorage;
let functionsInstance: Functions;

try {
  authInstance = getAuth(app);
} catch {
  authInstance = {} as Auth;
}

try {
  firestoreInstance = getFirestore(app);
} catch {
  firestoreInstance = {} as Firestore;
}

try {
  storageInstance = getStorage(app);
} catch {
  storageInstance = {} as FirebaseStorage;
}

try {
  functionsInstance = getFunctions(app);
} catch {
  functionsInstance = {} as Functions;
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
export const db = firestoreInstance;
export const storage = storageInstance;
export const functions = functionsInstance;

export default app;
