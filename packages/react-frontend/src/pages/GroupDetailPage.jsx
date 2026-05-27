import {
  Check,
  Copy,
  Link as LinkIcon,
  Package,
  UtensilsCrossed,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusMessage } from '../components/StatusMessage.jsx';
import {
  getGroup,
  getGroupMembers
} from '../lib/groupApi.js';

function buildInviteLink(inviteCode) {
  return `${window.location.origin}/join/${inviteCode}`;
}

function initials(member) {
  const name = member.displayName || member.email || '??';
  return name.slice(0, 2).toUpperCase();
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <button className="button button--dark" type="button" onClick={handleCopy} title={label}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

export function GroupDetailPage() {
  const { groupId } = useParams();
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => {
    if (!groupId) return undefined;

    let isCancelled = false;

    async function loadGroupDetails() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [groupInfoPayload, membersPayload] = await Promise.all([
          getGroup(groupId),
          getGroupMembers(groupId)
        ]);
        if (isCancelled) return;
        setGroupInfo(groupInfoPayload);
        setMembers(membersPayload.members ?? []);
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load group.');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadGroupDetails();
    return () => { isCancelled = true; };
  }, [groupId]);

  if (!groupId) {
    return (
      <section className="screen">
        <StatusMessage type="error" title="Group not found" message="The group link is not available." />
        <Link className="button" to="/groups">Back to Groups</Link>
      </section>
    );
  }

  const groupName = groupInfo?.name ?? '…';
  const isAdmin = groupInfo?.role === 'Admin';

  // Build combined pantry: flat list of all ingredients across members
  const combinedPantry = members
    .flatMap((m) =>
      (m.ingredients ?? []).map((ing) => ({
        ...ing,
        ownerName:
          m.displayName || m.email?.split('@')[0] || 'Member'
      }))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="screen group-detail-screen">
      <div className="gd-header">
        <div>
          <p className="eyebrow">{isAdmin ? 'Admin view' : 'Group details'}</p>
          <h1 className="gd-header__title">{groupName}</h1>
        </div>
        <Link className="gd-close-button" to="/groups" aria-label="Back to groups">
          <X size={20} />
        </Link>
      </div>

      {groupInfo?.description && (
        <p className="recipe-detail-description" style={{ marginBottom: '0.5rem' }}>{groupInfo.description}</p>
      )}

        {/* Invite code — shown to all members */}
        {groupInfo?.inviteCode && (
          <div className="invite-code-row" style={{ marginBottom: '1rem' }}>
            <code className="invite-code">{groupInfo.inviteCode}</code>
            <CopyButton text={groupInfo.inviteCode} label="Copy Code" />
            <CopyButton text={buildInviteLink(groupInfo.inviteCode)} label="Copy Link" />
          </div>
        )}

        {errorMessage && (
          <StatusMessage type="error" title="Error" message={errorMessage} />
        )}

        {/* Tab nav */}
        <div className="gd-tab-row">
          <button
            className={`gd-tab ${activeTab === 'members' ? 'gd-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('members')}
          >
            <Users size={16} /> Members
          </button>
          <button
            className={`gd-tab ${activeTab === 'pantry' ? 'gd-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('pantry')}
          >
            <Package size={16} /> Pantry
          </button>
          <button
            className={`gd-tab ${activeTab === 'recipes' ? 'gd-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('recipes')}
          >
            <UtensilsCrossed size={16} /> Recipes
          </button>
        </div>

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <section className="gd-tab-content">
            {isLoading ? (
              <StatusMessage type="loading" title="Loading members" message="Fetching group members…" />
            ) : members.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>No members found.</p>
            ) : (
              <div className="member-grid">
                {members.map((member) => {
                  const memberIngredients = member.ingredients ?? [];
                  const memberName =
                    member.displayName ||
                    member.email?.split('@')[0] ||
                    'Member';
                  const memberRole = member.role ?? 'Member';

                  return (
                    <article className="member-card surface-card" key={member.profileId ?? member.email}>
                      <div className="member-card__avatar">{initials(member)}</div>
                      <div className="member-card__info">
                        <strong>{memberName}</strong>
                        <small>{member.email ?? ''}</small>
                        <span className={`member-role-badge member-role-badge--${memberRole.toLowerCase()}`}>
                          {memberRole}
                        </span>
                      </div>
                      <div className="member-card__pantry">
                        <p className="member-card__pantry-heading">
                          <Package size={14} /> {memberIngredients.length} item{memberIngredients.length !== 1 ? 's' : ''}
                        </p>
                        {memberIngredients.length > 0 && (
                          <ul className="member-pantry-list">
                            {memberIngredients.slice(0, 5).map((ing) => (
                              <li key={ing.id}>
                                <span className="ing-name">{ing.name}</span>
                                {ing.quantity !== null && ing.quantity !== undefined && (
                                  <span className="ing-qty">{ing.quantity} {ing.unit}</span>
                                )}
                              </li>
                            ))}
                            {memberIngredients.length > 5 && (
                              <li className="ing-more">+{memberIngredients.length - 5} more</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* COMBINED PANTRY TAB */}
        {activeTab === 'pantry' && (
          <section className="gd-tab-content">
            <div className="section-heading" style={{ marginBottom: '1rem' }}>
              <h2>Combined Pantry</h2>
              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>{combinedPantry.length} items</span>
            </div>
            {isLoading ? (
              <StatusMessage type="loading" title="Loading pantry" message="Combining all members' ingredients…" />
            ) : combinedPantry.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>No pantry items yet. Ask members to add ingredients to My Pantry.</p>
            ) : (
              <div className="combined-pantry-list">
                {combinedPantry.map((ing) => (
                  <div className="combined-pantry-row" key={`${ing.ownerName}-${ing.id}`}>
                    <div className="combined-pantry-row__name">
                      <span>{ing.name}</span>
                      <span className="combined-pantry-row__owner">{ing.ownerName}</span>
                    </div>
                    {ing.quantity !== null && ing.quantity !== undefined && (
                      <span className="combined-pantry-row__qty">{ing.quantity} {ing.unit}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* RECIPES TAB */}
        {activeTab === 'recipes' && (
          <section className="gd-tab-content">
            <div className="gd-empty-tab">
              <UtensilsCrossed size={36} style={{ opacity: 0.3 }} />
              <p>Recipes coming soon.</p>
            </div>
          </section>
        )}
    </section>
  );
}
