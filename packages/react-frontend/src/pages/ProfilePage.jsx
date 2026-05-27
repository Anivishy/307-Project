import {
  AlertTriangle,
  Check,
  Save
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IngredientTypeahead } from '../components/IngredientTypeahead.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { TagInput } from '../components/TagInput.jsx';
import {
  fetchConstraintIngredientsByIds,
  fetchConstraints,
  saveConstraints
} from '../lib/constraintsApi.js';
import { getGroups } from '../lib/groupApi.js';
import { getSavedSession } from '../lib/session.js';

export function ProfilePage() {
  const session = getSavedSession();
  const displayName = session?.displayName ?? session?.email ?? 'Profile';
  const avatarInitial = (session?.displayName?.[0] ?? session?.email?.[0] ?? '?').toUpperCase();

  const [groupCount, setGroupCount] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [medicalRestrictions, setMedicalRestrictions] =
    useState([]);
  const [neverIncludeIngredients, setNeverIncludeIngredients] =
    useState([]);
  const [isLoadingConstraints, setIsLoadingConstraints] =
    useState(true);
  const [isSavingConstraints, setIsSavingConstraints] =
    useState(false);
  const [constraintMessage, setConstraintMessage] =
    useState('');
  const [constraintError, setConstraintError] = useState('');

  const totalConstraintCount =
    allergies.length +
    medicalRestrictions.length +
    neverIncludeIngredients.length;

  const constraintStats = useMemo(
    () => [
      `${allergies.length} allergies`,
      `${medicalRestrictions.length} medical rules`,
      `${neverIncludeIngredients.length} blocked ingredients`
    ],
    [
      allergies.length,
      medicalRestrictions.length,
      neverIncludeIngredients.length
    ]
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadConstraints() {
      setIsLoadingConstraints(true);
      setConstraintError('');

      try {
        const constraints = await fetchConstraints();
        const ingredients =
          await fetchConstraintIngredientsByIds(
            constraints.neverIncludeIngredientIds
          );

        if (isCancelled) {
          return;
        }

        setAllergies(constraints.allergies);
        setMedicalRestrictions(constraints.medicalRestrictions);
        setNeverIncludeIngredients(ingredients);
      } catch (error) {
        if (!isCancelled) {
          setConstraintError(
            error instanceof Error
              ? error.message
              : 'Unable to load dietary rules.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingConstraints(false);
        }
      }
    }

    async function loadGroupCount() {
      if (!getSavedSession()?.profileId) {
        return;
      }
      try {
        const payload = await getGroups();
        if (!isCancelled) {
          setGroupCount(payload.groups.length);
        }
      } catch {
        // non-critical, leave count as null
      }
    }

    void loadConstraints();
    void loadGroupCount();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSaveConstraints() {
    setIsSavingConstraints(true);
    setConstraintMessage('');
    setConstraintError('');

    try {
      const constraints = await saveConstraints({
        allergies,
        medicalRestrictions,
        neverIncludeIngredientIds: neverIncludeIngredients.map(
          (ingredient) => ingredient.id
        )
      });
      const ingredients = await fetchConstraintIngredientsByIds(
        constraints.neverIncludeIngredientIds
      );

      setAllergies(constraints.allergies);
      setMedicalRestrictions(constraints.medicalRestrictions);
      setNeverIncludeIngredients(ingredients);
      setConstraintMessage('Hard dietary rules saved.');
    } catch (error) {
      setConstraintError(
        error instanceof Error
          ? error.message
          : 'Unable to save dietary rules.'
      );
    } finally {
      setIsSavingConstraints(false);
    }
  }

  return (
    <section className="screen profile-screen">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Manage account details and hard dietary rules before group meals are generated."
      />

      <section className="profile-card surface-card">
        <div className="profile-avatar">{avatarInitial}</div>
        <div>
          <h2>{displayName}</h2>
          <p>{session?.email ?? ''}</p>
          <div className="profile-pills">
            <span>
              {groupCount !== null
                ? `${groupCount} group${groupCount !== 1 ? 's' : ''}`
                : '-'}
            </span>
            <span>
              {totalConstraintCount} hard rule{totalConstraintCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </section>

      <section
        className="constraints-card surface-card"
        aria-busy={isLoadingConstraints}>
        <div className="constraints-card__header">
          <div>
            <p className="eyebrow">Hard Rules</p>
            <h2>Dietary Restrictions</h2>
            <p>
              These rules block generated bundles for the whole
              group when a candidate includes a violating
              ingredient.
            </p>
          </div>
          <button
            className="button"
            type="button"
            onClick={handleSaveConstraints}
            disabled={
              isLoadingConstraints || isSavingConstraints
            }>
            {isSavingConstraints ? (
              <>
                <Save size={18} /> Saving
              </>
            ) : (
              <>
                <Check size={18} /> Save Rules
              </>
            )}
          </button>
        </div>

        <div
          className="constraint-summary"
          aria-label="Dietary restriction summary">
          {constraintStats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>

        {isLoadingConstraints ? (
          <StatusMessage
            type="loading"
            title="Loading dietary rules"
            message="Fetching saved profile constraints before showing the editor."
          />
        ) : (
          <div className="constraints-form">
            <TagInput
              label="Allergies"
              placeholder="Add allergy"
              values={allergies}
              onChange={setAllergies}
            />
            <TagInput
              label="Medical Restrictions"
              placeholder="Add hard restriction"
              values={medicalRestrictions}
              onChange={setMedicalRestrictions}
            />
            <IngredientTypeahead
              selected={neverIncludeIngredients}
              onChange={setNeverIncludeIngredients}
            />
          </div>
        )}

        {constraintError && (
          <StatusMessage
            type="error"
            title="Dietary rules unavailable"
            message={constraintError}
          />
        )}
        {constraintMessage && !constraintError && (
          <p className="constraint-success" role="status">
            <Check size={16} /> {constraintMessage}
          </p>
        )}
        <p className="constraint-note">
          <AlertTriangle size={16} /> Hard rules are stricter
          than preferences and always hide violating bundles.
        </p>
      </section>
    </section>
  );
}
