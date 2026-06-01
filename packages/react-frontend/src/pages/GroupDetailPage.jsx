import {
  Check,
  Copy,
  Package,
  Plus,
  SlidersHorizontal,
  UtensilsCrossed,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusMessage } from '@/components/StatusMessage.jsx';
import { BundleCandidateCard } from '@/components/BundleCandidateCard.jsx';
import { ApiRequestError } from '@/lib/api.js';
import {
  generateBundleCandidates,
  generateOneMoreBundleCandidate,
  getBundleCandidates,
  getGroup,
  getGroupMembers,
  getGroupSettings,
  getSpoonacularMode,
  selectBundleCandidate,
  updateGroupSettings
} from '@/lib/groupApi.js';
import { searchIngredientCatalog } from '@/lib/pantryApi.js';

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

function getGenerationErrorMessage(error, fallback) {
  if (error instanceof ApiRequestError && error.status === 503) {
    return 'Spoonacular API quota exceeded. Use mock generation for daily dev (npm run dev or set SPOONACULAR_MOCK_GENERATION=true), or try again later.';
  }

  return error instanceof Error ? error.message : fallback;
}

function buildGenerationProgress(courseTypes, labelPrefix = 'Searching') {
  const types =
    courseTypes.length > 0 ? courseTypes : ['main', 'side'];

  return types.map((courseType, index) => ({
    courseType,
    label: `${labelPrefix} ${courseType}`,
    status: index === 0 ? 'loading' : 'pending'
  }));
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
  const [stapleSuggestions, setStapleSuggestions] = useState([]);
  const [isStapleSearching, setIsStapleSearching] = useState(false);
  const [bundlePayload, setBundlePayload] = useState(null);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationNotice, setGenerationNotice] = useState('');
  const [spoonacularMode, setSpoonacularMode] = useState(null);
  const [generationForm, setGenerationForm] = useState({
    cuisine: '',
    query: '',
    courseTypes: ['main', 'side']
  });
  const [selectingBundleId, setSelectingBundleId] = useState('');
  const [staleSelection, setStaleSelection] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(null);

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
    setBundlePayload(null);
    setGenerationError('');
    setGenerationNotice('');
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
    const trimmedQuery = stapleQuery.trim();

    if (!trimmedQuery) {
      setStapleSuggestions([]);
      return undefined;
    }

    let isCurrentSearch = true;
    const timeoutId = window.setTimeout(() => {
      setIsStapleSearching(true);
      searchIngredientCatalog(trimmedQuery)
        .then((ingredients) => {
          if (isCurrentSearch) {
            setStapleSuggestions(ingredients);
          }
        })
        .catch(() => {
          if (isCurrentSearch) {
            setStapleSuggestions([]);
          }
        })
        .finally(() => {
          if (isCurrentSearch) {
            setIsStapleSearching(false);
          }
        });
    }, 250);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeoutId);
    };
  }, [stapleQuery]);

  useEffect(() => {
    if (!groupId || activeTab !== 'recipes') {
      return undefined;
    }

    let isCancelled = false;

    async function loadCandidates() {
      setIsCandidatesLoading(true);
      setGenerationError('');

      try {
        const [payload, modePayload] = await Promise.all([
          getBundleCandidates(groupId),
          getSpoonacularMode().catch(() => null)
        ]);

        if (!isCancelled) {
          setBundlePayload(payload);
          setSpoonacularMode(modePayload);
        }
      } catch (error) {
        if (!isCancelled) {
          setGenerationError(
            getGenerationErrorMessage(
              error,
              'Unable to load bundle candidates.'
            )
          );
        }
      } finally {
        if (!isCancelled) {
          setIsCandidatesLoading(false);
        }
      }
    }

    void loadCandidates();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, groupId]);

  useEffect(() => {
    if (!isGenerating || !generationProgress?.length) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (!current?.length) {
          return current;
        }

        const loadingIndex = current.findIndex(
          (item) => item.status === 'loading'
        );
        const pendingIndex = current.findIndex(
          (item) => item.status === 'pending'
        );

        if (loadingIndex === -1 && pendingIndex >= 0) {
          return current.map((item, index) =>
            index === pendingIndex
              ? { ...item, status: 'loading' }
              : item
          );
        }

        if (loadingIndex >= 0) {
          return current.map((item, index) => {
            if (index === loadingIndex) {
              return { ...item, status: 'done' };
            }

            if (index === loadingIndex + 1 && item.status === 'pending') {
              return { ...item, status: 'loading' };
            }

            return item;
          });
        }

        return current;
      });
    }, 900);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [generationProgress, isGenerating]);

  async function reloadCandidates() {
    if (!groupId) {
      return null;
    }

    const payload = await getBundleCandidates(groupId);
    setBundlePayload(payload);
    setStaleSelection(null);
    return payload;
  }

  async function handleSelectBundle(candidate, { force = false } = {}) {
    if (!groupId || !bundlePayload) {
      return;
    }

    setSelectingBundleId(candidate.id);
    setGenerationError('');
    setGenerationNotice('');
    setStaleSelection(null);

    try {
      if (!force) {
        const freshPayload = await getBundleCandidates(groupId);

        if (freshPayload.candidateSetId !== bundlePayload.candidateSetId) {
          setStaleSelection({
            candidate,
            message:
              'This candidate set may be stale. Refresh to load the latest set, or confirm to select anyway.'
          });
          return;
        }
      }

      await selectBundleCandidate(groupId, {
        bundleId: candidate.id,
        pantrySnapshotVersion: bundlePayload.pantrySnapshotVersion,
        activeBundleVersion: bundlePayload.activeBundleVersion,
        ...(force ? { force: true } : {})
      });

      await reloadCandidates();
      setGenerationNotice(`Selected "${candidate.title}" as the active bundle.`);
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.status === 409 &&
        !force
      ) {
        setStaleSelection({
          candidate,
          message: error.message
        });
        return;
      }

      setGenerationError(
        error instanceof Error
          ? error.message
          : 'Unable to select bundle candidate.'
      );
    } finally {
      setSelectingBundleId('');
    }
  }

  async function handleRefreshCandidates() {
    if (!groupId) {
      return;
    }

    setIsCandidatesLoading(true);
    setGenerationError('');
    setGenerationNotice('');

    try {
      await reloadCandidates();
      setGenerationNotice('Refreshed bundle candidates.');
    } catch (error) {
      setGenerationError(
        getGenerationErrorMessage(
          error,
          'Unable to refresh bundle candidates.'
        )
      );
    } finally {
      setIsCandidatesLoading(false);
    }
  }

  async function handleGenerateBundles() {
    if (!groupId) return;

    if (bundlePayload?.candidates?.length) {
      const confirmed = window.confirm(
        'Generate 3 new bundles? This replaces the current candidate set on this server.'
      );

      if (!confirmed) {
        return;
      }
    }

    setIsGenerating(true);
    setGenerationError('');
    setGenerationNotice('');
    setGenerationProgress(
      buildGenerationProgress(generationForm.courseTypes)
    );

    try {
      const payload = await generateBundleCandidates(groupId, generationForm);
      setBundlePayload(payload);
      setGenerationNotice('Generated a new candidate set.');
    } catch (error) {
      setGenerationError(
        getGenerationErrorMessage(
          error,
          'Unable to generate bundle candidates.'
        )
      );
    } finally {
      setGenerationProgress((current) =>
        current?.map((item) => ({ ...item, status: 'done' })) ?? null
      );
      window.setTimeout(() => {
        setGenerationProgress(null);
      }, 700);
      setIsGenerating(false);
    }
  }

  async function handleGenerateOneMore() {
    if (!groupId) return;

    setIsGenerating(true);
    setGenerationError('');
    setGenerationNotice('');
    setGenerationProgress([
      {
        courseType: 'bundle',
        label: 'Finding another bundle candidate',
        status: 'loading'
      }
    ]);

    try {
      const payload = await generateOneMoreBundleCandidate(groupId);
      setBundlePayload(payload);
      setGenerationNotice('Added one more bundle candidate.');
    } catch (error) {
      setGenerationError(
        getGenerationErrorMessage(
          error,
          'Unable to generate another bundle candidate.'
        )
      );
    } finally {
      setGenerationProgress((current) =>
        current?.map((item) => ({ ...item, status: 'done' })) ?? null
      );
      window.setTimeout(() => {
        setGenerationProgress(null);
      }, 700);
      setIsGenerating(false);
    }
  }

  function toggleCourseType(courseType) {
    setGenerationForm((current) => {
      const hasType = current.courseTypes.includes(courseType);
      return {
        ...current,
        courseTypes: hasType
          ? current.courseTypes.filter((type) => type !== courseType)
          : [...current.courseTypes, courseType]
      };
    });
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

    const match = stapleSuggestions.find((item) => {
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
    setStapleSuggestions([]);
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
          <section className="gd-tab-content gd-recipes-tab">
            {spoonacularMode && (
              <p className="settings-note">
                Spoonacular mode: catalog {spoonacularMode.catalog}, generation{' '}
                {spoonacularMode.generation}
                {spoonacularMode.generation === 'live'
                  ? ' (uses API points)'
                  : ''}
              </p>
            )}

            {bundlePayload && (
              <p className="settings-note">
                Validation: missing ingredients{' '}
                {bundlePayload.allowMissingIngredients ? 'allowed' : 'blocked'}; staples{' '}
                {bundlePayload.staplesEnabled ? 'enabled' : 'disabled'}.
                {bundlePayload.filteredOutCandidateCount > 0
                  ? ` ${bundlePayload.filteredOutCandidateCount} candidate(s) were filtered out by validation.`
                  : ''}
              </p>
            )}

            {!isCandidatesLoading && combinedPantry.length === 0 && (
              <div className="gd-empty-tab">
                <Package size={36} style={{ opacity: 0.3 }} />
                <p>
                  The combined group pantry is empty. Add ingredients in My Pantry before
                  generating bundles.
                </p>
              </div>
            )}

            {isAdmin && (
              <div className="surface-card recipes-generate-card" style={{ marginBottom: '1rem' }}>
                <div className="section-heading">
                  <h2>Generate Bundles</h2>
                </div>
                <div className="pantry-form-grid recipes-generate-grid">
                  <label className="field">
                    <span>Cuisine direction</span>
                    <input
                      value={generationForm.cuisine}
                      onChange={(event) =>
                        setGenerationForm((current) => ({
                          ...current,
                          cuisine: event.target.value
                        }))
                      }
                      placeholder="italian"
                    />
                  </label>
                  <label className="field">
                    <span>Search hint</span>
                    <input
                      value={generationForm.query}
                      onChange={(event) =>
                        setGenerationForm((current) => ({
                          ...current,
                          query: event.target.value
                        }))
                      }
                      placeholder="pasta night"
                    />
                  </label>
                </div>
                <div className="staple-list" aria-label="Course types">
                  {['appetizer', 'main', 'side', 'dessert'].map((courseType) => (
                    <button
                      key={courseType}
                      type="button"
                      className={`staple-chip ${
                        generationForm.courseTypes.includes(courseType)
                          ? 'staple-chip--default'
                          : ''
                      }`}
                      onClick={() => toggleCourseType(courseType)}>
                      {courseType}
                    </button>
                  ))}
                </div>
                <div className="settings-actions">
                  <button
                    className="button"
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerateBundles}>
                    <UtensilsCrossed size={18} /> Generate 3 Bundles
                  </button>
                  <button
                    className="button button--dark"
                    type="button"
                    disabled={isGenerating || !bundlePayload?.candidates?.length}
                    onClick={handleGenerateOneMore}>
                    <Plus size={18} /> Generate 1 More
                  </button>
                </div>
              </div>
            )}

            {generationProgress?.length > 0 && (
              <section
                className="surface-card generation-progress-card"
                aria-live="polite"
                aria-busy={isGenerating}>
                <div className="section-heading">
                  <h2>Generating bundles</h2>
                </div>
                <ul className="generation-progress-list">
                  {generationProgress.map((item) => (
                    <li
                      className={`generation-progress-item generation-progress-item--${item.status}`}
                      key={`${item.courseType}-${item.label}`}>
                      <span>{item.label}</span>
                      <span className="generation-progress-item__status">
                        {item.status === 'loading'
                          ? 'Searching…'
                          : item.status === 'done'
                            ? 'Done'
                            : 'Waiting…'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {generationError && (
              <StatusMessage type="error" title="Generation error" message={generationError} />
            )}
            {generationNotice && (
              <StatusMessage type="success" title="Generation update" message={generationNotice} />
            )}

            {staleSelection && (
              <section className="surface-card" style={{ marginBottom: '1rem' }}>
                <div className="section-heading">
                  <h2>Stale candidate set</h2>
                </div>
                <p className="settings-note">{staleSelection.message}</p>
                <div className="settings-actions">
                  <button
                    className="button button--dark"
                    type="button"
                    onClick={handleRefreshCandidates}>
                    Refresh candidates
                  </button>
                  <button
                    className="button"
                    type="button"
                    disabled={Boolean(selectingBundleId)}
                    onClick={() =>
                      handleSelectBundle(staleSelection.candidate, {
                        force: true
                      })
                    }>
                    Select anyway
                  </button>
                </div>
              </section>
            )}

            {isCandidatesLoading ? (
              <StatusMessage
                type="loading"
                title="Loading candidates"
                message="Fetching bundle candidates for this group."
              />
            ) : bundlePayload?.needsGeneration ? (
              <div className="gd-empty-tab">
                <UtensilsCrossed size={36} style={{ opacity: 0.3 }} />
                <p>No generated bundles yet. An admin can generate candidates above.</p>
              </div>
            ) : bundlePayload?.candidates?.length ? (
              <div className="ingredient-stack">
                {bundlePayload.candidates.map((candidate) => (
                  <BundleCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isAdmin={isAdmin}
                    isSelecting={selectingBundleId === candidate.id}
                    isSelectDisabled={Boolean(selectingBundleId)}
                    onSelect={handleSelectBundle}
                  />
                ))}
              </div>
            ) : (
              <div className="gd-empty-tab">
                <UtensilsCrossed size={36} style={{ opacity: 0.3 }} />
                <p>
                  {bundlePayload?.filteredOutCandidateCount > 0
                    ? `No valid candidates remain. ${bundlePayload.filteredOutCandidateCount} option(s) were filtered out by pantry, staples, or dietary rules.`
                    : 'No valid bundle candidates matched the current pantry and settings.'}
                </p>
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
                          placeholder="Search ingredient suggestions"
                          value={stapleQuery}
                          disabled={!canEditSettings || isSettingsSaving}
                          onChange={(event) => setStapleQuery(event.target.value)}
                        />
                        {(stapleSuggestions.length > 0 ||
                          (stapleQuery.trim() && isStapleSearching)) && (
                          <div className="typeahead-results" role="listbox">
                            {isStapleSearching && (
                              <div className="result-row muted">
                                Searching...
                              </div>
                            )}
                            {!isStapleSearching &&
                              stapleSuggestions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className="result-row"
                                  disabled={!canEditSettings || isSettingsSaving}
                                  onClick={() => {
                                    setStapleQuery(item.name);
                                    setStapleSuggestions([item]);
                                  }}>
                                  <span>{item.name}</span>
                                  <small>{item.category}</small>
                                </button>
                              ))}
                          </div>
                        )}
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
