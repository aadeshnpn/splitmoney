'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/db';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsTestUser: (name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let isMockAuth = false;

    const initAuth = async () => {
      // First check for test user (only in dev/test mode for security)
      const allowTestAuth = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ALLOW_TEST_AUTH === 'true';
      if (allowTestAuth && typeof window !== 'undefined') {
        const testUserId = localStorage.getItem('test_user_id');
        if (testUserId) {
          isMockAuth = true;
          const u = await db.getUser(testUserId);
          if (u) {
            setUser(u);
            setLoading(false);
            return;
          }
        }
      }

      // If no test user, try Firebase
      try {
        if (auth && auth.app) {
          unsubscribe = onAuthStateChanged(auth, async (fUser) => {
            if (isMockAuth) return; // Ignore firebase if using mock

            setFirebaseUser(fUser);
            if (fUser) {
              const newUser: User = {
                id: fUser.uid,
                displayName: fUser.displayName || 'Unknown User',
                email: fUser.email || '',
                avatarUrl: fUser.photoURL || null,
                householdId: null,
                createdAt: Date.now(),
              };
              
              try {
                const existingUser = await db.getUser(fUser.uid);
                if (existingUser) {
                  newUser.householdId = existingUser.householdId;
                  await db.updateUser(newUser);
                } else {
                  await db.createUser(newUser);
                }
                setUser(newUser);
              } catch (e) {
                console.error("Error upserting user:", e);
                setUser(newUser);
              }
            } else {
              setUser(null);
            }
            setLoading(false);
          }, (err: any) => {
            console.warn("Firebase auth state error:", err);
            if (err?.code === 'auth/invalid-api-key' || err?.message?.includes('api-key')) {
              setAuthError("Firebase API key is missing or invalid. Please update .env.local with your project credentials.");
            }
            if (!isMockAuth) setLoading(false);
          });
        } else {
          if (!isMockAuth) setLoading(false);
        }
      } catch (err: any) {
        console.warn("Firebase Auth init warning:", err);
        if (!isMockAuth) setLoading(false);
      }
    };

    initAuth();

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign in error:", err);
      if (err.code === 'auth/invalid-api-key' || err.message?.includes('api-key')) {
        setAuthError("Firebase API Key is missing or invalid. Please configure .env.local with your Firebase project credentials.");
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setAuthError(`Domain "${host}" is not authorized in Firebase Console. Add "${host}" under Authentication -> Settings -> Authorized domains in Firebase Console.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else {
        setAuthError(err.message || "Failed to sign in with Google.");
      }
    }
  };

  const signInAsTestUser = async (name: string = 'Test User', id: string = 'test-user-1') => {
    const testUser: User = {
      id,
      displayName: name,
      email: 'test@example.com',
      avatarUrl: null,
      householdId: null,
      createdAt: Date.now(),
    };
    try {
      const existing = await db.getUser(testUser.id);
      if (existing) {
        testUser.householdId = existing.householdId;
        await db.updateUser(testUser);
      } else {
        await db.createUser(testUser);
      }
      setUser(testUser);
      localStorage.setItem('test_user_id', testUser.id);
    } catch (e) {
      setUser(testUser);
      localStorage.setItem('test_user_id', testUser.id);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('test_user_id');
      await firebaseSignOut(auth);
      setUser(null);
    } catch (e) {
      console.error("Sign out error:", e);
      localStorage.removeItem('test_user_id');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      const updatedUser = await db.getUser(user.id);
      if (updatedUser) {
        setUser(updatedUser);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).signInAsTestUser = signInAsTestUser;
      
      // Expose a helper to easily add mock members to a household for E2E tests
      (window as any).addMockMembers = async (householdId: string) => {
        const u2: User = {
          id: 'adv-user-2', displayName: 'Advanced Two', email: 'adv2@example.com',
          avatarUrl: null, householdId, createdAt: Date.now()
        };
        const u3: User = {
          id: 'adv-user-3', displayName: 'Advanced Three', email: 'adv3@example.com',
          avatarUrl: null, householdId, createdAt: Date.now()
        };
        await db.createUser(u2);
        await db.createUser(u3);
        await db.addHouseholdMember({ householdId, userId: 'adv-user-2', role: 'member', joinedAt: Date.now() });
        await db.addHouseholdMember({ householdId, userId: 'adv-user-3', role: 'member', joinedAt: Date.now() });
      };
    }
  }, [signInAsTestUser]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, authError, signInWithGoogle, signInAsTestUser, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
