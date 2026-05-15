import { useEffect, useMemo, useState } from 'react';
import { searchConstraintIngredients } from '../lib/constraintsApi.js';

export function IngredientTypeahead({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const selectedIds = useMemo(
    () => new Set(selected.map((ingredient) => ingredient.id)),
    [selected]
  );
  const trimmedQuery = query.trim();
  const visibleResults = trimmedQuery ? results : [];

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      return undefined;
    }

    let isCurrentSearch = true;
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      searchConstraintIngredients(trimmedQuery)
        .then((ingredients) => {
          if (isCurrentSearch) {
            setResults(
              ingredients.filter(
                (ingredient) => !selectedIds.has(ingredient.id)
              )
            );
          }
        })
        .catch(() => {
          if (isCurrentSearch) {
            setResults([]);
          }
        })
        .finally(() => {
          if (isCurrentSearch) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery, selectedIds]);

  function addIngredient(ingredient) {
    onChange([...selected, ingredient]);
    setQuery('');
    setResults([]);
  }

  function removeIngredient(ingredientId) {
    onChange(
      selected.filter(
        (ingredient) => ingredient.id !== ingredientId
      )
    );
  }

  return (
    <label className="field">
      <span>Never Include Ingredients</span>
      <div className="ingredient-picker">
        <div
          className="constraint-chip-list"
          aria-live="polite">
          {selected.length === 0 ? (
            <span className="constraint-chip constraint-chip--empty">
              No blocked ingredients
            </span>
          ) : (
            selected.map((ingredient) => (
              <button
                className="constraint-chip constraint-chip--removable"
                key={ingredient.id}
                onClick={() => removeIngredient(ingredient.id)}
                type="button"
                aria-label={`Remove ${ingredient.name}`}>
                {ingredient.name}{' '}
                <span aria-hidden="true">x</span>
              </button>
            ))
          )}
        </div>
        <input
          className="constraint-input"
          value={query}
          placeholder="Search ingredients"
          onChange={(event) => setQuery(event.target.value)}
        />
        {(visibleResults.length > 0 ||
          (trimmedQuery && isSearching)) && (
          <div className="typeahead-results" role="listbox">
            {isSearching && (
              <div className="result-row muted">
                Searching...
              </div>
            )}
            {!isSearching &&
              visibleResults.map((ingredient) => (
                <button
                  key={ingredient.id}
                  type="button"
                  className="result-row"
                  onClick={() => addIngredient(ingredient)}>
                  <span>{ingredient.name}</span>
                  <small>{ingredient.category}</small>
                </button>
              ))}
          </div>
        )}
      </div>
    </label>
  );
}
