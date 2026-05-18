import { Plus } from 'lucide-react';
import { useState } from 'react';

function normalizeTag(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function TagInput({
  label,
  placeholder,
  values,
  onChange
}) {
  const [draft, setDraft] = useState('');

  function addDraft() {
    const nextValue = normalizeTag(draft);

    if (!nextValue || values.includes(nextValue)) {
      setDraft('');
      return;
    }

    onChange([...values, nextValue]);
    setDraft('');
  }

  function removeValue(value) {
    onChange(
      values.filter((currentValue) => currentValue !== value)
    );
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="tag-input">
        <div
          className="constraint-chip-list"
          aria-live="polite">
          {values.length === 0 ? (
            <span className="constraint-chip constraint-chip--empty">
              None added
            </span>
          ) : (
            values.map((value) => (
              <button
                className="constraint-chip constraint-chip--removable"
                key={value}
                onClick={() => removeValue(value)}
                type="button"
                aria-label={`Remove ${value}`}>
                {value} <span aria-hidden="true">x</span>
              </button>
            ))
          )}
        </div>
        <div className="tag-input__entry">
          <input
            className="constraint-input"
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addDraft();
              }
            }}
          />
          <button
            className="button button--dark tag-input__add"
            type="button"
            onClick={addDraft}
            disabled={!draft.trim()}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>
    </label>
  );
}
