import { useState } from 'react'

type TagInputProps = {
  label: string
  placeholder: string
  values: string[]
  onChange: (values: string[]) => void
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function TagInput({ label, placeholder, values, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function addDraft() {
    const nextValue = normalizeTag(draft)

    if (!nextValue || values.includes(nextValue)) {
      setDraft('')
      return
    }

    onChange([...values, nextValue])
    setDraft('')
  }

  function removeValue(value: string) {
    onChange(values.filter((currentValue) => currentValue !== value))
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="tag-input">
        <div className="chips" aria-live="polite">
          {values.map((value) => (
            <button
              className="chip"
              key={value}
              onClick={() => removeValue(value)}
              type="button"
              aria-label={`Remove ${value}`}
            >
              {value}
              <span aria-hidden="true">x</span>
            </button>
          ))}
        </div>
        <input
          value={draft}
          placeholder={placeholder}
          onBlur={addDraft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              addDraft()
            }
          }}
        />
      </div>
    </label>
  )
}
