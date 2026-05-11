import { useEffect, useState } from 'react'

import './App.css'
import { IngredientTypeahead } from './components/IngredientTypeahead'
import { TagInput } from './components/TagInput'
import type { IngredientSummary } from './lib/api'
import { fetchConstraints, fetchIngredientsByIds, saveConstraints } from './lib/api'

function App() {
  const [allergies, setAllergies] = useState<string[]>([])
  const [medicalRestrictions, setMedicalRestrictions] = useState<string[]>([])
  const [neverIncludeIngredients, setNeverIncludeIngredients] = useState<IngredientSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadConstraints() {
      try {
        const constraints = await fetchConstraints()
        const ingredients = await fetchIngredientsByIds(constraints.neverIncludeIngredientIds)

        if (!isMounted) {
          return
        }

        setAllergies(constraints.allergies)
        setMedicalRestrictions(constraints.medicalRestrictions)
        setNeverIncludeIngredients(ingredients)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load constraints.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadConstraints()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSave() {
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const constraints = await saveConstraints({
        allergies,
        medicalRestrictions,
        neverIncludeIngredientIds: neverIncludeIngredients.map((ingredient) => ingredient.id),
      })

      setAllergies(constraints.allergies)
      setMedicalRestrictions(constraints.medicalRestrictions)
      setMessage('Dietary restrictions saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save constraints.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="profile-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Dietary Restrictions</h1>
        </div>
        <button className="primary-button" type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </section>

      <section className="constraints-panel" aria-busy={isLoading}>
        {isLoading ? (
          <p className="status">Loading dietary restrictions...</p>
        ) : (
          <>
            <TagInput
              label="Allergies"
              placeholder="Add allergy"
              values={allergies}
              onChange={setAllergies}
            />
            <TagInput
              label="Medical Restrictions"
              placeholder="Add restriction"
              values={medicalRestrictions}
              onChange={setMedicalRestrictions}
            />
            <IngredientTypeahead
              selected={neverIncludeIngredients}
              onChange={setNeverIncludeIngredients}
            />
          </>
        )}
      </section>

      {(message || error) && (
        <p className={error ? 'status error' : 'status success'} role="status">
          {error || message}
        </p>
      )}
    </main>
  )
}

export default App
