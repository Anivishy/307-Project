import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

function formatContributorSummary(allocations = []) {
  if (!allocations.length) {
    return 'Unassigned';
  }

  return allocations
    .map((allocation) =>
      `${allocation.userName} (${allocation.quantity} ${allocation.unit})`
    )
    .join(', ');
}

export function BundleCandidateCard({
  candidate,
  isAdmin,
  isSelecting = false,
  isSelectDisabled = false,
  onSelect,
  overrides = []
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMissingIngredients = candidate.missingIngredients?.length > 0;

  return (
    <article className="surface-card bundle-candidate-card">
      <div className="section-heading">
        <h3>{candidate.title}</h3>
        <div className="bundle-candidate-card__badges">
          {candidate.isSelected && (
            <span className="staple-chip staple-chip--default">Active</span>
          )}
          {hasMissingIngredients && (
            <span className="staple-chip bundle-candidate-card__missing-flag">
              <AlertTriangle size={14} aria-hidden="true" />
              Missing items
            </span>
          )}
          {overrides.map((override) => (
            <span
              className="staple-chip bundle-candidate-card__override-flag"
              key={override.id ?? override.label}
              title={override.rationale ?? 'Soft preference overridden'}>
              Override: {override.label}
            </span>
          ))}
        </div>
      </div>

      <p>{candidate.rationale}</p>

      <div className="staple-list">
        {candidate.courses?.map((course) => (
          <span className="staple-chip" key={`${candidate.id}-${course.title}`}>
            {course.type}: {course.title}
          </span>
        ))}
      </div>

      {hasMissingIngredients && (
        <p className="settings-note">
          Missing:{' '}
          {candidate.missingIngredients.map((item) => item.name).join(', ')}
        </p>
      )}

      <div className="bundle-candidate-card__actions">
        <button
          className="button button--dark"
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {isExpanded ? 'Hide details' : 'Show details'}
        </button>

        {isAdmin && !candidate.isSelected && (
          <button
            className="button"
            type="button"
            disabled={isSelectDisabled}
            onClick={() => onSelect?.(candidate)}>
            {isSelecting ? 'Selecting…' : 'Select as active bundle'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="bundle-candidate-card__details">
          {candidate.assumedStaples?.length > 0 && (
            <section className="bundle-candidate-card__section">
              <h4>Assumed staples</h4>
              <ul className="bundle-candidate-card__list">
                {candidate.assumedStaples.map((item) => (
                  <li key={item.ingredientId ?? item.name}>{item.name}</li>
                ))}
              </ul>
            </section>
          )}

          {candidate.ingredientList?.length > 0 && (
            <section className="bundle-candidate-card__section">
              <h4>Ingredients</h4>
              <ul className="bundle-candidate-card__list">
                {candidate.ingredientList.map((ingredient) => (
                  <li key={ingredient.ingredientId}>
                    <span>
                      {ingredient.name} — {ingredient.quantity} {ingredient.unit}
                    </span>
                    <span className="bundle-candidate-card__contributors">
                      {formatContributorSummary(
                        candidate.contributorMapping?.[ingredient.ingredientId]
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {candidate.instructions?.length > 0 && (
            <section className="bundle-candidate-card__section">
              <h4>Instructions</h4>
              <ol className="bundle-candidate-card__instructions">
                {candidate.instructions.map((step, index) => (
                  <li key={`${candidate.id}-step-${index}`}>{step}</li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
