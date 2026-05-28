import {
  AlertTriangle,
  Check,
  Copy,
  Package,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  UtensilsCrossed,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusMessage } from '../components/StatusMessage.jsx';
import {
  getBundleCandidates,
  getGroup,
  getGroupMembers,
  getGroupSettings,
  isStaleCandidateError,
  selectBundleCandidate,
  updateGroupSettings
} from '../lib/groupApi.js';

function buildInviteLink(inviteCode) {
  return `${window.location.origin}/join/${inviteCode}`;
}

function initials(member) {
  const name = member.displayName || member.email || '??';
  return name.slice(0, 2).toUpperCase();
}

function isAdminRole(role) {
  return ['admin', 'owner'].includes(String(role ?? '').toLowerCase());
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
  const [settings, setSettings] = useState(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [customStaplesDraft, setCustomStaplesDraft] = useState([]);
  const [stapleQuery, setStapleQuery] = useState('');
  const [candidateSet, setCandidateSet] = useState(null);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [isSelectingBundle, setIsSelectingBundle] = useState(false);
  const [candidatesError, setCandidatesError] = useState('');
  const [candidatesNotice, setCandidatesNotice] = useState('');
  const [staleSelection, setStaleSelection] = useState(null);

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

  useEffect(() => {
    setSettings(null);
    setCustomStaplesDraft([]);
    setStapleQuery('');
    setSettingsError('');
    setSettingsNotice('');
    setCandidateSet(null);
    setCandidatesError('');
    setCandidatesNotice('');
    setStaleSelection(null);
  }, [groupId]);

  const groupName = groupInfo?.name ?? '…';
  const isAdmin = isAdminRole(groupInfo?.role);

  useEffect(() => {
    if (!groupId || activeTab !== 'settings' || !isAdmin || settings) {
      return undefined;
    }

    let isCancelled = false;

    async function loadGroupSettings() {
      setIsSettingsLoading(true);
      setSettingsError('');
      setSettingsNotice('');

      try {
        const settingsPayload = await getGroupSettings(groupId);
        if (isCancelled) return;
        setSettings(settingsPayload);
        setCustomStaplesDraft(settingsPayload.customStaples ?? []);
      } catch (error) {
        if (!isCancelled) {
          setSettingsError(
            error instanceof Error
              ? error.message
              : 'Unable to load group settings.'
          );
        }
      } finally {
        if (!isCancelled) setIsSettingsLoading(false);
      }
    }

    void loadGroupSettings();
    return () => { isCancelled = true; };
  }, [activeTab, groupId, isAdmin, settings]);

  useEffect(() => {
    if (!groupId || activeTab !== 'recipes' || !isAdmin || candidateSet) {
      return undefined;
    }

    let isCancelled = false;

    async function loadCandidates() {
      setIsCandidatesLoading(true);
      setCandidatesError('');

      try {
        const payload = await getBundleCandidates(groupId);
        if (isCancelled) return;
        setCandidateSet(payload);
      } catch (error) {
        if (!isCancelled) {
          setCandidatesError(
            error instanceof Error
              ? error.message
              : 'Unable to load bundle candidates.'
          );
        }
      } finally {
        if (!isCancelled) setIsCandidatesLoading(false);
      }
    }

    void loadCandidates();
    return () => { isCancelled = true; };
  }, [activeTab, candidateSet, groupId, isAdmin]);

  async function refreshBundleCandidates() {
    if (!groupId) return;

    setIsCandidatesLoading(true);
    setCandidatesError('');
    setCandidatesNotice('');
    setStaleSelection(null);

    try {
      const payload = await getBundleCandidates(groupId);
      setCandidateSet(payload);
    } catch (error) {
      setCandidatesError(
        error instanceof Error
          ? error.message
          : 'Unable to refresh bundle candidates.'
      );
    } finally {
      setIsCandidatesLoading(false);
    }
  }

  function updateCandidateSetAfterSelection(result) {
    setCandidateSet((current) => {
      if (!current) return current;

      return {
        ...current,
        selectedBundleId: result.selectedBundleId,
        pantrySnapshotVersion: result.pantrySnapshotVersion,
        activeBundleVersion: result.activeBundleVersion,
        candidates: (current.candidates ?? []).map((candidate) => ({
          ...candidate,
          pantrySnapshotVersion: result.pantrySnapshotVersion,
          activeBundleVersion: result.activeBundleVersion,
          isSelected: candidate.id === result.selectedBundleId
        }))
      };
    });
  }

  async function submitBundleSelection(candidate, selection, { force = false } = {}) {
    if (!groupId) return;

    setIsSelectingBundle(true);
    setCandidatesError('');
    setCandidatesNotice('');

    try {
      const result = await selectBundleCandidate(groupId, {
        ...selection,
        ...(force ? { force: true } : {})
      });

      updateCandidateSetAfterSelection(result);
      setStaleSelection(null);
      setCandidatesNotice(`${result.selectedBundleTitle ?? candidate.title} selected.`);
    } catch (error) {
      if (!force && isStaleCandidateError(error)) {
        setStaleSelection({
          candidate,
          selection,
          message:
            error instanceof Error
              ? error.message
              : 'This candidate set is stale.',
          details: error.details
        });
      } else {
        setCandidatesError(
          error instanceof Error
            ? error.message
            : 'Unable to select this bundle.'
        );
      }
    } finally {
      setIsSelectingBundle(false);
    }
  }

  function handleSelectBundle(candidate) {
    if (!candidateSet) return;

    void submitBundleSelection(candidate, {
      bundleId: candidate.id,
      pantrySnapshotVersion: candidateSet.pantrySnapshotVersion,
      activeBundleVersion: candidateSet.activeBundleVersion
    });
  }

  function handleProceedWithStaleSelection() {
    if (!staleSelection) return;
    void submitBundleSelection(
      staleSelection.candidate,
      staleSelection.selection,
      { force: true }
    );
  }

  async function saveSettingsPatch(updates, successMessage) {
    if (!groupId) return;

    setIsSettingsSaving(true);
    setSettingsError('');
    setSettingsNotice('');

    try {
      const nextSettings = await updateGroupSettings(groupId, updates);
      setSettings(nextSettings);
      setCustomStaplesDraft(nextSettings.customStaples ?? []);
      setSettingsNotice(successMessage);
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : 'Unable to save group settings.'
      );
    } finally {
      setIsSettingsSaving(false);
    }
  }

  function handleAllowMissingToggle(event) {
    void saveSettingsPatch(
      { allowMissingIngredients: event.target.checked },
      'Missing ingredient setting saved.'
    );
  }

  function handleStaplesToggle(event) {
    void saveSettingsPatch(
      { staplesEnabled: event.target.checked },
      'Staples setting saved.'
    );
  }

  function handleAddCustomStaple() {
    if (!settings) return;

    const normalizedQuery = stapleQuery.trim().toLowerCase();
    if (!normalizedQuery) return;

    const match = settings.ingredientCatalog.find((item) => {
      const ingredientName = item.name.toLowerCase();
      return (
        item.id === normalizedQuery ||
        ingredientName === normalizedQuery ||
        ingredientName.includes(normalizedQuery)
      );
    });

    if (!match) {
      setSettingsNotice('');
      setSettingsError(
        'Pick a staple from the ingredient suggestions before adding it.'
      );
      return;
    }

    const isAlreadyListed =
      settings.defaultStaplesPreset.some((item) => item.id === match.id) ||
      customStaplesDraft.some((item) => item.id === match.id);

    if (isAlreadyListed) {
      setSettingsNotice('');
      setSettingsError('That staple is already listed for the group.');
      return;
    }

    setSettingsError('');
    setSettingsNotice('');
    setCustomStaplesDraft((current) => [...current, match]);
    setStapleQuery('');
  }

  function handleRemoveCustomStaple(stapleId) {
    setSettingsError('');
    setSettingsNotice('');
    setCustomStaplesDraft((current) =>
      current.filter((item) => item.id !== stapleId)
    );
  }

  function handleSaveStaples() {
    if (!settings) return;

    void saveSettingsPatch(
      {
        staplesEnabled: Boolean(settings.staplesEnabled),
        customStaples: customStaplesDraft.map((item) => item.id)
      },
      'Staples list saved.'
    );
  }

  if (!groupId) {
    return (
      <section className="screen">
        <StatusMessage type="error" title="Group not found" message="The group link is not available." />
        <Link className="button" to="/groups">Back to Groups</Link>
      </section>
    );
  }

  const canEditSettings =
    isAdmin && (!settings?.viewerRole || isAdminRole(settings.viewerRole));

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
          {isAdmin && (
            <button
              className={`gd-tab ${activeTab === 'settings' ? 'gd-tab--active' : ''}`}
              type="button"
              onClick={() => setActiveTab('settings')}
            >
              <SlidersHorizontal size={16} /> Settings
            </button>
          )}
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
            {isAdmin ? (
              <>
                <div className="section-heading bundle-candidate-heading">
                  <h2>Bundle Candidates</h2>
                  <button
                    className="button button--dark"
                    type="button"
                    disabled={isCandidatesLoading || isSelectingBundle}
                    onClick={refreshBundleCandidates}>
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>

                {isCandidatesLoading ? (
                  <StatusMessage
                    type="loading"
                    title="Loading candidates"
                    message="Checking current pantry and bundle versions."
                  />
                ) : candidatesError ? (
                  <StatusMessage
                    type="error"
                    title="Candidates unavailable"
                    message={candidatesError}
                  />
                ) : candidateSet?.candidates?.length > 0 ? (
                  <div className="bundle-candidate-list">
                    {candidateSet.candidates.map((candidate) => (
                      <article
                        className={`bundle-candidate-card surface-card ${
                          candidate.isSelected ? 'is-selected' : ''
                        }`}
                        key={candidate.id}>
                        <div className="bundle-candidate-card__header">
                          <div>
                            <h3>{candidate.title}</h3>
                            {candidate.rationale && (
                              <p>{candidate.rationale}</p>
                            )}
                          </div>
                          {candidate.isSelected && (
                            <span className="settings-badge">Selected</span>
                          )}
                        </div>

                        <div className="bundle-candidate-card__meta">
                          {(candidate.courses ?? []).map((course) => (
                            <span key={`${candidate.id}-${course.type}-${course.title}`}>
                              {course.title}
                            </span>
                          ))}
                        </div>

                        <div className="bundle-candidate-card__ingredients">
                          {(candidate.ingredientList ?? []).map((ingredient) => (
                            <span key={`${candidate.id}-${ingredient.ingredientId}`}>
                              {ingredient.name} · {ingredient.quantity} {ingredient.unit}
                            </span>
                          ))}
                        </div>

                        <button
                          className="button"
                          type="button"
                          disabled={isSelectingBundle || candidate.isSelected}
                          onClick={() => handleSelectBundle(candidate)}>
                          {candidate.isSelected ? (
                            <Check size={18} />
                          ) : (
                            <UtensilsCrossed size={18} />
                          )}
                          {candidate.isSelected ? 'Selected' : 'Select bundle'}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="gd-empty-tab">
                    <UtensilsCrossed size={36} style={{ opacity: 0.3 }} />
                    <p>No bundle candidates available.</p>
                  </div>
                )}

                {candidatesNotice && (
                  <p className="settings-status settings-status--success">
                    {candidatesNotice}
                  </p>
                )}

                {staleSelection && (
                  <div className="modal-backdrop">
                    <section
                      aria-labelledby="stale-candidate-title"
                      aria-modal="true"
                      className="stale-candidate-dialog surface-card"
                      role="dialog">
                      <div className="stale-candidate-dialog__header">
                        <AlertTriangle size={22} />
                        <h2 id="stale-candidate-title">Stale Candidate Set</h2>
                      </div>
                      <p>
                        Pantry or active bundle data changed since this candidate list
                        was generated.
                      </p>
                      <p className="settings-note">
                        {staleSelection.message}
                      </p>
                      <div className="stale-candidate-dialog__versions">
                        <span>
                          Pantry {staleSelection.details?.submitted?.pantrySnapshotVersion}
                          {' -> '}
                          {staleSelection.details?.current?.pantrySnapshotVersion}
                        </span>
                        <span>
                          Bundle {staleSelection.details?.submitted?.activeBundleVersion}
                          {' -> '}
                          {staleSelection.details?.current?.activeBundleVersion}
                        </span>
                      </div>
                      <div className="settings-actions">
                        <button
                          className="button button--dark"
                          type="button"
                          disabled={isCandidatesLoading || isSelectingBundle}
                          onClick={refreshBundleCandidates}>
                          <RefreshCw size={18} /> Refresh candidates
                        </button>
                        <button
                          className="button"
                          type="button"
                          disabled={isSelectingBundle}
                          onClick={handleProceedWithStaleSelection}>
                          <Check size={18} /> Proceed anyway
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </>
            ) : (
              <div className="gd-empty-tab">
                <UtensilsCrossed size={36} style={{ opacity: 0.3 }} />
                <p>Recipes coming soon.</p>
              </div>
            )}
          </section>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && isAdmin && (
          <section className="gd-tab-content">
            {isSettingsLoading ? (
              <StatusMessage
                type="loading"
                title="Loading settings"
                message="Fetching admin controls for this group."
              />
            ) : settings ? (
              <>
                <section className="settings-card surface-card">
                  <div className="section-heading">
                    <h2>Group Settings</h2>
                    <span className="settings-badge">
                      {canEditSettings ? 'Admin controls' : 'Member view'}
                    </span>
                  </div>

                  <div className="toggle-row">
                    <div>
                      <h3>Allow Missing Ingredients</h3>
                      <p>
                        Enable bundles that include clearly disclosed shopping gaps.
                        Disabled means missing ingredients block a candidate before it appears.
                      </p>
                    </div>

                    <label
                      className={`toggle-switch ${
                        settings.allowMissingIngredients ? 'is-active' : ''
                      } ${isSettingsSaving ? 'is-busy' : ''}`}>
                      <input
                        type="checkbox"
                        aria-label="Allow Missing Ingredients"
                        checked={Boolean(settings.allowMissingIngredients)}
                        disabled={!canEditSettings || isSettingsSaving}
                        onChange={handleAllowMissingToggle}
                      />
                      <span className="toggle-switch__track">
                        <span className="toggle-switch__thumb" />
                      </span>
                    </label>
                  </div>

                  <p className="settings-note">
                    {settings.allowMissingIngredients
                      ? 'Candidates can appear with shopping disclosures.'
                      : 'Only pantry-feasible candidates are shown right now.'}
                  </p>
                </section>

                <section className="settings-card surface-card">
                  <div className="section-heading">
                    <h2>Pantry Staples</h2>
                    <span className="settings-badge">
                      {settings.staplesEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="toggle-row">
                    <div>
                      <h3>Use Group Staples</h3>
                      <p>
                        When enabled, approved basics are treated as effectively
                        unlimited during group recipe generation.
                      </p>
                    </div>

                    <label
                      className={`toggle-switch ${
                        settings.staplesEnabled ? 'is-active' : ''
                      } ${isSettingsSaving ? 'is-busy' : ''}`}>
                      <input
                        type="checkbox"
                        aria-label="Use Group Staples"
                        checked={Boolean(settings.staplesEnabled)}
                        disabled={!canEditSettings || isSettingsSaving}
                        onChange={handleStaplesToggle}
                      />
                      <span className="toggle-switch__track">
                        <span className="toggle-switch__thumb" />
                      </span>
                    </label>
                  </div>

                  <div className="staples-panel">
                    <div>
                      <h3>Default Staples Preset</h3>
                      <div
                        className="staple-list"
                        aria-label="Default staples preset">
                        {settings.defaultStaplesPreset.map((item) => (
                          <span
                            className="staple-chip staple-chip--default"
                            key={item.id}>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3>Custom Staples</h3>
                      <p className="settings-note">
                        Add extra ingredients the household agrees to treat like staples.
                      </p>
                      <div className="staple-editor">
                        <input
                          className="staple-search"
                          list="staple-ingredient-suggestions"
                          placeholder="Search ingredient suggestions"
                          value={stapleQuery}
                          disabled={!canEditSettings || isSettingsSaving}
                          onChange={(event) => setStapleQuery(event.target.value)}
                        />
                        <datalist id="staple-ingredient-suggestions">
                          {settings.ingredientCatalog.map((item) => (
                            <option key={item.id} value={item.name} />
                          ))}
                        </datalist>
                        <button
                          className="button button--dark"
                          type="button"
                          disabled={!canEditSettings || isSettingsSaving}
                          onClick={handleAddCustomStaple}>
                          <Plus size={18} /> Add Staple
                        </button>
                      </div>

                      <div
                        className="staple-list"
                        aria-label="Custom staples list">
                        {customStaplesDraft.length === 0 ? (
                          <span className="staple-chip staple-chip--empty">
                            No custom staples yet
                          </span>
                        ) : (
                          customStaplesDraft.map((item) => (
                            <button
                              className="staple-chip staple-chip--removable"
                              key={item.id}
                              type="button"
                              disabled={!canEditSettings || isSettingsSaving}
                              onClick={() => handleRemoveCustomStaple(item.id)}
                              aria-label={`Remove ${item.name}`}>
                              {item.name}
                              <X size={14} aria-hidden="true" />
                            </button>
                          ))
                        )}
                      </div>

                      <div className="settings-actions">
                        <button
                          className="button"
                          type="button"
                          disabled={!canEditSettings || isSettingsSaving}
                          onClick={handleSaveStaples}>
                          <Check size={18} /> Save Staples
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {settingsNotice && (
                  <p className="settings-status settings-status--success">
                    {settingsNotice}
                  </p>
                )}
              </>
            ) : (
              <StatusMessage
                type="error"
                title="Settings unavailable"
                message={settingsError || 'Unable to load group settings.'}
              />
            )}

            {settings && settingsError && (
              <StatusMessage
                type="error"
                title="Settings unavailable"
                message={settingsError}
              />
            )}
          </section>
        )}
    </section>
  );
}
