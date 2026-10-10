export {};

declare global {
  interface Window {
    db: typeof import('@/lib/db').default;
    signInAsTestUser?: (name?: string, id?: string) => Promise<void>;
    addMockMembers?: (householdId: string) => Promise<void>;
  }
}
