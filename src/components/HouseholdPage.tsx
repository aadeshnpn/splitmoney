'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useExpenses } from '@/hooks/useExpenses';
import { useBalances } from '@/hooks/useBalances';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import BottomNav from '@/components/BottomNav';
import { formatCents } from '@/lib/money';
import { User, HouseholdMember } from '@/types';
import './HouseholdPage.css';

import HouseholdSwitcher from '@/components/HouseholdSwitcher';

export default function HouseholdPage() {
  const { user } = useAuth();
  const { household, userHouseholds, members, loading, switchHousehold, createHousehold, joinHousehold, leaveHousehold, generateNewInviteToken, refreshMembers } = useHousehold();
  const { expenses } = useExpenses();
  const { youOwe, owedToYou } = useBalances();
  const router = useRouter();

  const [householdName, setHouseholdName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(HouseholdMember & { user: User }) | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Check if logged-in user is an admin in the household
  const currentUserRole = useMemo(() => {
    if (!user || !members) return 'member';
    const currentMember = members.find((m) => m.userId === user.id);
    return currentMember?.role || 'member';
  }, [user, members]);

  const isAdmin = currentUserRole === 'admin';

  // Calculate total paid by each member
  const memberPaidMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of expenses) {
      if (exp.isDeleted) continue;
      const prev = map.get(exp.paidBy) || 0;
      map.set(exp.paidBy, prev + exp.totalAmount);
    }
    return map;
  }, [expenses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) return;
    setIsCreating(true);
    try {
      await createHousehold(householdName);
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;
    setIsJoining(true);
    try {
      let token = inviteToken;
      try {
        const url = new URL(inviteToken);
        token = url.searchParams.get('token') || inviteToken;
      } catch {
        // Not a full URL
      }

      await joinHousehold(token);
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (e) {
      console.error(e);
      alert('Failed to join household. Invalid token.');
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveHousehold();
      setIsLeaveModalOpen(false);
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  };

  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    if (!household) return;
    const link = `${window.location.origin}/household/invite?token=${household.inviteToken}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        prompt('Copy invite link:', link);
      });
    } else {
      prompt('Copy invite link:', link);
    }
  };

  const handleToggleRole = async (targetMember: HouseholdMember & { user: User }) => {
    if (!household || !isAdmin) return;
    const newRole = targetMember.role === 'admin' ? 'member' : 'admin';
    try {
      await db.updateMemberRole(household.id, targetMember.userId, newRole);
      await refreshMembers();
      setSelectedMember(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update member role.');
    }
  };

  const handleRemoveMember = async (targetMember: HouseholdMember & { user: User }) => {
    if (!household || !isAdmin) return;
    if (!confirm(`Are you sure you want to remove ${targetMember.user?.displayName || 'this member'} from the household?`)) return;
    try {
      await db.removeMember(household.id, targetMember.userId);
      await refreshMembers();
      setSelectedMember(null);
    } catch (err) {
      console.error(err);
      alert('Failed to remove member.');
    }
  };

  if (loading) {
    return <div className="household-loading">Loading household settings...</div>;
  }

  // User has no household
  if (!user?.householdId || !household) {
    return (
      <div className="household-setup-container">
        <h1 className="household-title">Setup Your Household</h1>

        <div className="household-forms-wrapper">
          <Card className="household-form-card">
            <h2>Create a Household</h2>
            <p>Start a new household to invite housemates & share expenses.</p>
            <form onSubmit={handleCreate}>
              <Input
                placeholder="Household Name"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
              />
              <Button type="submit" disabled={isCreating} className="w-full mt-4">
                {isCreating ? 'Creating...' : 'Create Household'}
              </Button>
            </form>
          </Card>

          <div className="household-divider">OR</div>

          <Card className="household-form-card">
            <h2>Join with Invite Link</h2>
            <p>Have an invite token or link? Paste it below.</p>
            <form onSubmit={handleJoin}>
              <Input
                placeholder="Invite Token or Link"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" disabled={isJoining} className="w-full mt-4">
                {isJoining ? 'Joining...' : 'Join Household'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // User has a household
  return (
    <div className="household-manage-container" style={{ padding: '1rem', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          ← Dashboard
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Household Directory
        </h1>
        <div style={{ width: '80px' }} />
      </header>

      {/* Multi-Household Switcher Bar */}
      {userHouseholds.length > 1 && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              🏡 Your Households ({userHouseholds.length})
            </span>
            <HouseholdSwitcher />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {userHouseholds.map((h) => {
              const isActive = h.id === household.id;
              return (
                <button
                  key={h.id}
                  onClick={() => switchHousehold(h.id)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '20px',
                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {isActive ? `✓ ${h.name}` : h.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Household Info Card */}
      <Card className="household-details-card" style={{ marginBottom: '1.25rem' }}>
        <div className="household-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>{household.name}</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Created {new Date(household.createdAt).toLocaleDateString()} • {members.length} Members
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={() => setIsLeaveModalOpen(true)}>
            Leave
          </Button>
        </div>

        {/* Invite Link Section */}
        <div className="invite-section" style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>Invite Members</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Share this link to invite others to join <strong>{household.name}</strong>.
          </p>
          <div className="invite-link-box" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <code style={{ display: 'none' }}>{`${typeof window !== 'undefined' ? window.location.origin : ''}/household/invite?token=${household.inviteToken}`}</code>
            <input
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/household/invite?token=${household.inviteToken}`}
              style={{
                flex: 1,
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
              }}
            />
            <Button onClick={copyInviteLink} size="sm">
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={generateNewInviteToken}>
              🔄 Generate New Link
            </Button>
          )}
        </div>
      </Card>

      {/* Household Members List */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Household Members ({members.length})
          </h2>
          {isAdmin && (
            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent)', padding: '0.25rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
              Admin View
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {members.map((member) => {
            const isSelf = member.userId === user?.id;
            const totalPaid = memberPaidMap.get(member.userId) || 0;
            const userOwedObj = owedToYou.find((b) => b.user.id === member.userId);
            const youOweObj = youOwe.find((b) => b.user.id === member.userId);

            return (
              <div
                key={member.userId}
                onClick={() => setSelectedMember(member)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Avatar src={member.user?.avatarUrl || undefined} name={member.user?.displayName || 'User'} size="md" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {member.user?.displayName || 'User'} {isSelf && '(You)'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Total Paid: <strong>{formatCents(totalPaid)}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '8px',
                      backgroundColor: member.role === 'admin' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                      color: member.role === 'admin' ? 'var(--accent)' : 'var(--text-secondary)',
                      border: member.role === 'admin' ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {member.role === 'admin' ? '👑 Admin' : 'Member'}
                  </span>

                  {userOwedObj && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                      Owes you {formatCents(userOwedObj.amount)}
                    </span>
                  )}
                  {youOweObj && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                      You owe {formatCents(youOweObj.amount)}
                    </span>
                  )}

                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Member Details Modal */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title="Member Details"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0.5rem 0 1rem 0' }}>
            <Avatar src={selectedMember.user?.avatarUrl || undefined} name={selectedMember.user?.displayName || 'User'} size="lg" />
            <h3 style={{ margin: '0.75rem 0 0.15rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
              {selectedMember.user?.displayName || 'User'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {selectedMember.user?.email || 'No email registered'}
            </p>

            <div style={{ marginTop: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  backgroundColor: selectedMember.role === 'admin' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                  color: selectedMember.role === 'admin' ? 'var(--accent)' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                Role: {selectedMember.role === 'admin' ? 'Administrator' : 'Member'}
              </span>
            </div>

            {/* Financial Stats */}
            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginTop: '1.25rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Contributed</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {formatCents(memberPaidMap.get(selectedMember.userId) || 0)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pairwise Balance</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                  {(() => {
                    const userOwedObj = owedToYou.find((b) => b.user.id === selectedMember.userId);
                    const youOweObj = youOwe.find((b) => b.user.id === selectedMember.userId);
                    if (userOwedObj) return <span style={{ color: 'var(--accent)' }}>Owes you {formatCents(userOwedObj.amount)}</span>;
                    if (youOweObj) return <span style={{ color: 'var(--danger)' }}>You owe {formatCents(youOweObj.amount)}</span>;
                    return <span style={{ color: 'var(--text-muted)' }}>Settled</span>;
                  })()}
                </div>
              </div>
            </div>

            {/* Admin Management Actions */}
            {isAdmin && selectedMember.userId !== user?.id && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleToggleRole(selectedMember)}
                >
                  {selectedMember.role === 'admin' ? 'Demote to Member' : '👑 Promote to Admin'}
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => handleRemoveMember(selectedMember)}
                >
                  Remove Member from Household
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Leave Household Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Leave Household"
      >
        <p>Are you sure you want to leave {household.name}? You will need a new invite link to rejoin.</p>
        <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="secondary" className="w-full" onClick={() => setIsLeaveModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" className="w-full" onClick={handleLeave}>
            Leave Household
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
