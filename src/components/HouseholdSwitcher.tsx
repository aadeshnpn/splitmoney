'use client';

import { useState } from 'react';
import { useHousehold } from '@/hooks/useHousehold';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function HouseholdSwitcher() {
  const { household, userHouseholds, switchHousehold, createHousehold, joinHousehold } = useHousehold();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSwitch = async (id: string) => {
    if (id === household?.id) {
      setIsOpen(false);
      return;
    }
    await switchHousehold(id);
    setIsOpen(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    setSubmitting(true);
    try {
      await createHousehold(newHouseholdName.trim());
      setNewHouseholdName('');
      setShowCreate(false);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create household.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTokenInput.trim()) return;
    setSubmitting(true);
    try {
      let token = inviteTokenInput.trim();
      try {
        const url = new URL(token);
        token = url.searchParams.get('token') || token;
      } catch {
        // Not a URL
      }
      await joinHousehold(token);
      setInviteTokenInput('');
      setShowJoin(false);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to join household. Invalid invite token.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '20px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'var(--transition)',
        }}
      >
        <span>🏠</span>
        <span>{household?.name || 'Select Household'}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>▾</span>
      </button>

      {/* Switcher Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Switch Household" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* List of User's Households */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
            {userHouseholds.map((h) => {
              const isActive = h.id === household?.id;
              return (
                <div
                  key={h.id}
                  onClick={() => handleSwitch(h.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                    >
                      🏠
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {h.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Created {new Date(h.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--accent)',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                      }}
                    >
                      ✓ Active
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>Switch →</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Tabs for Create / Join */}
          {!showCreate && !showJoin && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
                ➕ Create New
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)}>
                🔗 Join via Code
              </Button>
            </div>
          )}

          {/* Inline Create Form */}
          {showCreate && (
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Create New Household</h4>
              <input
                type="text"
                placeholder="Household Name"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                style={{
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !newHouseholdName.trim()}>
                  {submitting ? 'Creating...' : 'Create Household'}
                </Button>
              </div>
            </form>
          )}

          {/* Inline Join Form */}
          {showJoin && (
            <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Join via Invite Link/Code</h4>
              <input
                type="text"
                placeholder="Paste invite link or token"
                value={inviteTokenInput}
                onChange={(e) => setInviteTokenInput(e.target.value)}
                style={{
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => setShowJoin(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting || !inviteTokenInput.trim()}>
                  {submitting ? 'Joining...' : 'Join'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
