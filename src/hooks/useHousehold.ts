'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/db';
import { findHouseholdByInviteTokenRemote, fullSync, syncToFirebase } from '@/lib/sync';
import { Household, HouseholdMember, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useHousehold() {
  const { user, refreshUser } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [userHouseholds, setUserHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<(HouseholdMember & { user: User })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHouseholdData = useCallback(async () => {
    if (!user?.id) {
      setHousehold(null);
      setUserHouseholds([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const allHouseholds = await db.getUserHouseholds(user.id);
      setUserHouseholds(allHouseholds);

      const activeHouseholdId = user.householdId || (allHouseholds.length > 0 ? allHouseholds[0].id : null);
      if (activeHouseholdId && !user.householdId) {
        await db.updateUserHousehold(user.id, activeHouseholdId);
      }

      if (activeHouseholdId) {
        const h = await db.getHousehold(activeHouseholdId);
        if (h) {
          setHousehold(h);
          const m = await db.getHouseholdMembersWithUsers(activeHouseholdId);
          setMembers(m);
        }
      } else {
        setHousehold(null);
        setMembers([]);
      }
    } catch (e) {
      console.error('Error loading household data', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.householdId]);

  useEffect(() => {
    loadHouseholdData();
  }, [loadHouseholdData]);

  const switchHousehold = async (targetHouseholdId: string) => {
    if (!user) return;
    await db.updateUserHousehold(user.id, targetHouseholdId);
    await refreshUser();
    await loadHouseholdData();
  };

  const createHousehold = async (name: string) => {
    if (!user) return;
    const householdId = uuidv4();
    const inviteToken = uuidv4();
    const newHousehold: Household = {
      id: householdId,
      name,
      createdBy: user.id,
      inviteToken,
      createdAt: Date.now(),
    };
    await db.createHousehold(newHousehold);
    await db.addHouseholdMember({
      householdId,
      userId: user.id,
      role: 'admin',
      joinedAt: Date.now(),
    });
    await db.updateUserHousehold(user.id, householdId);
    // Push immediately so housemate can join via invite token on another device
    await syncToFirebase(householdId);
    await refreshUser();
    await loadHouseholdData();
  };

  const joinHousehold = async (inviteToken: string) => {
    if (!user) return;

    let h = await db.getHouseholdByToken(inviteToken);
    if (!h) {
      h = await findHouseholdByInviteTokenRemote(inviteToken);
    }
    if (!h) throw new Error('Invalid invite token');

    const existingMembers = await db.getMembers(h.id);
    const alreadyMember = existingMembers.some((m) => m.userId === user.id);
    if (!alreadyMember) {
      await db.addHouseholdMember({
        householdId: h.id,
        userId: user.id,
        role: 'member',
        joinedAt: Date.now(),
      });
    }

    await db.updateUserHousehold(user.id, h.id);
    await syncToFirebase(h.id);
    await fullSync(h.id);
    await refreshUser();
    await loadHouseholdData();
  };

  const leaveHousehold = async () => {
    if (!user || !user.householdId) return;
    const leavingId = user.householdId;
    await db.removeHouseholdMember(leavingId, user.id);
    const remainingHouseholds = userHouseholds.filter((h) => h.id !== leavingId);
    const nextHouseholdId = remainingHouseholds.length > 0 ? remainingHouseholds[0].id : null;
    await db.updateUserHousehold(user.id, nextHouseholdId);
    await syncToFirebase(leavingId);
    await refreshUser();
    await loadHouseholdData();
  };

  const refreshMembers = async () => {
    await loadHouseholdData();
  };

  const generateNewInviteToken = async () => {
    if (!household) return;
    const newToken = uuidv4();
    await db.updateHouseholdToken(household.id, newToken);
    await syncToFirebase(household.id);
    await loadHouseholdData();
  };

  return {
    household,
    userHouseholds,
    members,
    loading,
    switchHousehold,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    refreshMembers,
    generateNewInviteToken,
  };
}
