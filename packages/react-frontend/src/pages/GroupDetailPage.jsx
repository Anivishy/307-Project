import {
  ArrowLeft,
  Bell,
  Check,
  ChefHat,
  Sparkles,
  TriangleAlert
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';
import { GlassIconButton } from '../components/GlassIconButton.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { groups } from '../data/recipes.js';
import {
  getBundleCandidates,
  getGroupSettings,
  updateGroupSettings
} from '../lib/groupApi.js';

const members = [
  { name: 'Ani', role: 'Scrum Master' },
  { name: 'Vinayak', role: 'Product Owner' },
  { name: 'Kartik', role: 'Tester' },
  { name: 'Leon', role: 'Lead Developer' }
];

function formatMissingItem(item) {
  return `${item.quantityNeeded} ${item.unit} ${item.name}`;
}

export function GroupDetailPage() {
  const { groupId } = useParams();
  const group = groups.find((item) => item.id === groupId);
  const [settings, setSettings] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filteredOutCount, setFilteredOutCount] = useState(0);
  const [
    hardConstraintRejectedCount,
    setHardConstraintRejectedCount
  ] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customStaplesDraft, setCustomStaplesDraft] = useState(
    []
  );
  const [stapleQuery, setStapleQuery] = useState('');

  useEffect(() => {
    if (!group) {
      return undefined;
    }

    let isCancelled = false;

    async function loadGroupDetails() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [settingsPayload, candidatePayload] =
          await Promise.all([
            getGroupSettings(group.id),
            getBundleCandidates(group.id)
          ]);

        if (isCancelled) {
          return;
        }

        setSettings(settingsPayload);
        setCustomStaplesDraft(settingsPayload.customStaples);
        setCandidates(candidatePayload.candidates);
        setFilteredOutCount(
          candidatePayload.filteredOutCandidateCount
        );
        setHardConstraintRejectedCount(
          candidatePayload.hardConstraintRejectedCount ?? 0
        );
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load group settings.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadGroupDetails();

    return () => {
      isCancelled = true;
    };
  }, [group]);

  async function handleToggleChange(event) {
    const nextValue = event.target.checked;
    setIsSaving(true);
    setErrorMessage('');

    try {
      const updatedSettings = await updateGroupSettings(
        group.id,
        {
          allowMissingIngredients: nextValue
        }
      );
      await refreshCandidates(updatedSettings);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save group settings.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshCandidates(nextSettings) {
    const updatedCandidates = await getBundleCandidates(
      group.id
    );
    setSettings(nextSettings);
    setCustomStaplesDraft(nextSettings.customStaples);
    setCandidates(updatedCandidates.candidates);
    setFilteredOutCount(
      updatedCandidates.filteredOutCandidateCount
    );
    setHardConstraintRejectedCount(
      updatedCandidates.hardConstraintRejectedCount ?? 0
    );
  }

  async function handleStaplesToggle(event) {
    const nextValue = event.target.checked;
    setIsSaving(true);
    setErrorMessage('');

    try {
      const nextSettings = await updateGroupSettings(group.id, {
        staplesEnabled: nextValue,
        customStaples: customStaplesDraft.map((item) => item.id)
      });

      await refreshCandidates(nextSettings);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update staples settings.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddCustomStaple() {
    if (!settings) {
      return;
    }

    const normalizedQuery = stapleQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return;
    }

    const match = settings.ingredientCatalog.find(
      (item) =>
        item.id === normalizedQuery ||
        item.name.toLowerCase() === normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery)
    );

    if (!match) {
      setErrorMessage(
        'Pick a staple from the ingredient suggestions before adding it.'
      );
      return;
    }

    const isAlreadyListed =
      settings.defaultStaplesPreset.some(
        (item) => item.id === match.id
      ) ||
      customStaplesDraft.some((item) => item.id === match.id);

    if (isAlreadyListed) {
      setErrorMessage(
        'That staple is already listed for the group.'
      );
      return;
    }

    setErrorMessage('');
    setCustomStaplesDraft((current) => [...current, match]);
    setStapleQuery('');
  }

  function handleRemoveCustomStaple(stapleId) {
    setCustomStaplesDraft((current) =>
      current.filter((item) => item.id !== stapleId)
    );
  }

  async function handleSaveStaples() {
    if (!settings) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const nextSettings = await updateGroupSettings(group.id, {
        staplesEnabled: settings.staplesEnabled,
        customStaples: customStaplesDraft.map((item) => item.id)
      });

      await refreshCandidates(nextSettings);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save custom staples.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!group) {
    return (
      <section className="screen">
        <EmptyState
          title="Group not found"
          message="The group link is not available."
          action={
            <Link className="button" to="/groups">
              Back to Groups
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="screen screen--full group-detail-screen">
      <div className="group-detail-hero">
        <img src={group.image} alt={group.name} />
        <div className="group-detail-hero__shade" />
        <Link
          className="detail-back-button"
          to="/groups"
          aria-label="Back to groups">
          <ArrowLeft size={22} />
        </Link>
        <GlassIconButton
          icon={Bell}
          label="Group notifications"
          className="detail-save-button"
        />
      </div>

      <article className="group-detail-panel">
        <div className="detail-handle" />
        <p className="eyebrow">{group.members} members</p>
        <h1>{group.name}</h1>
        <p className="recipe-detail-description">
          {group.description}
        </p>

        <section
          className="member-row"
          aria-label="Group members">
          {members.map((member) => (
            <div key={member.name}>
              <span>{member.name[0]}</span>
              <strong>{member.name}</strong>
              <small>{member.role}</small>
            </div>
          ))}
        </section>

        <section className="settings-card surface-card">
          <div className="section-heading">
            <h2>Group Settings</h2>
            <span className="settings-badge">
              {settings?.viewerRole === 'admin'
                ? 'Admin controls'
                : 'Member view'}
            </span>
          </div>

          <div className="toggle-row">
            <div>
              <h3>Allow Missing Ingredients</h3>
              <p>
                Enable this when the group is okay with bundles
                that include shopping gaps. Disabled means
                missing ingredients block the candidate before
                it appears.
              </p>
            </div>

            <label
              className={`toggle-switch ${settings?.allowMissingIngredients ? 'is-active' : ''} ${
                isSaving ? 'is-busy' : ''
              }`}>
              <input
                type="checkbox"
                aria-label="Allow Missing Ingredients"
                checked={Boolean(
                  settings?.allowMissingIngredients
                )}
                disabled={
                  !settings ||
                  settings.viewerRole !== 'admin' ||
                  isSaving
                }
                onChange={handleToggleChange}
              />
              <span className="toggle-switch__track">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>

          <p className="settings-note">
            {settings?.allowMissingIngredients
              ? 'Candidates can appear with shopping disclosures.'
              : 'Only pantry-feasible candidates are shown right now.'}
          </p>

          {errorMessage && (
            <StatusMessage
              type="error"
              title="Settings unavailable"
              message={errorMessage}
            />
          )}
        </section>

        <section className="settings-card surface-card">
          <div className="section-heading">
            <h2>Staples</h2>
            <span className="settings-badge">
              {settings?.staplesEnabled
                ? 'Enabled'
                : 'Disabled'}
            </span>
          </div>

          <div className="toggle-row">
            <div>
              <h3>Use Group Staples</h3>
              <p>
                When enabled, approved staples are treated as
                effectively unlimited during bundle generation.
              </p>
            </div>

            <label
              className={`toggle-switch ${settings?.staplesEnabled ? 'is-active' : ''} ${
                isSaving ? 'is-busy' : ''
              }`}>
              <input
                type="checkbox"
                aria-label="Use Group Staples"
                checked={Boolean(settings?.staplesEnabled)}
                disabled={
                  !settings ||
                  settings.viewerRole !== 'admin' ||
                  isSaving
                }
                onChange={handleStaplesToggle}
              />
              <span className="toggle-switch__track">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>

          {settings?.staplesEnabled && (
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
                  Add extra ingredients the household agrees to
                  treat like staples.
                </p>
                <div className="staple-editor">
                  <input
                    className="staple-search"
                    list="staple-ingredient-suggestions"
                    placeholder="Search ingredient suggestions"
                    value={stapleQuery}
                    onChange={(event) =>
                      setStapleQuery(event.target.value)
                    }
                  />
                  <datalist id="staple-ingredient-suggestions">
                    {settings.ingredientCatalog.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                  <button
                    className="button button--dark"
                    type="button"
                    onClick={handleAddCustomStaple}>
                    Add Staple
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
                        onClick={() =>
                          handleRemoveCustomStaple(item.id)
                        }>
                        {item.name}{' '}
                        <span aria-hidden="true">x</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="settings-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={handleSaveStaples}
                    disabled={isSaving}>
                    <Check size={18} /> Save Staples
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="generator-card surface-card">
          <div className="section-heading">
            <h2>Bundle Candidates</h2>
            <Sparkles size={20} />
          </div>

          {isLoading ? (
            <StatusMessage
              type="loading"
              title="Loading candidates"
              message="Checking the pantry and group settings before showing bundle options."
            />
          ) : (
            <>
              <div className="bundle-summary">
                <span>{candidates.length} visible bundles</span>
                {filteredOutCount > 0 && (
                  <span>
                    {filteredOutCount} hidden by current
                    generation rules
                  </span>
                )}
                {hardConstraintRejectedCount > 0 && (
                  <span>
                    {hardConstraintRejectedCount} blocked by
                    hard dietary rules
                  </span>
                )}
              </div>

              <div className="bundle-grid">
                {candidates.map((candidate) => (
                  <article
                    className="bundle-card"
                    key={candidate.id}>
                    <div className="bundle-card__header">
                      <div>
                        <p className="eyebrow">
                          Candidate Bundle
                        </p>
                        <h3>{candidate.title}</h3>
                      </div>

                      {candidate.missingIngredients.length >
                        0 && (
                        <span className="bundle-card__badge">
                          <TriangleAlert size={16} /> Missing
                          items
                        </span>
                      )}
                    </div>

                    <div className="spec-pills bundle-course-pills">
                      {candidate.courses.map((course) => (
                        <span
                          key={`${candidate.id}-${course.type}`}>
                          <ChefHat size={14} /> {course.type}:{' '}
                          {course.title}
                        </span>
                      ))}
                    </div>

                    <p className="bundle-rationale">
                      {candidate.rationale}
                    </p>

                    {candidate.assumedStaples?.length > 0 && (
                      <p className="bundle-staples-note">
                        Staples assumed:{' '}
                        {candidate.assumedStaples
                          .map((item) => item.name)
                          .join(', ')}
                      </p>
                    )}

                    {candidate.missingIngredients.length >
                      0 && (
                      <section
                        className="missing-items"
                        aria-label={`Missing items for ${candidate.title}`}>
                        <h4>Missing Items</h4>
                        <ul>
                          {candidate.missingIngredients.map(
                            (item) => (
                              <li
                                key={`${candidate.id}-${item.ingredientId}`}>
                                {formatMissingItem(item)}
                              </li>
                            )
                          )}
                        </ul>
                      </section>
                    )}

                    <div className="bundle-actions">
                      <button className="button" type="button">
                        <Sparkles size={18} /> Review Bundle
                      </button>
                      <Link
                        className="button button--dark"
                        to="/approvals">
                        <Check size={18} /> Requests
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </article>
    </section>
  );
}
