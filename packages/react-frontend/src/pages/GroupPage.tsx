import { useParams } from 'react-router-dom'
import './GroupPage.css'

function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()

  // Loading and error states will be wired to real data in 4E.
  // Using placeholder values for layout purposes (4A).
  const isLoading = false
  const error: string | null = null

  const group = {
    name: 'Group Name',
    summary: 'Group description / summary goes here',
  }

  if (isLoading) {
    return (
      <div className="group-page">
        <div className="group-loading">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
          <div className="cards-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="group-page">
        <div className="group-error">
          <p>Could not load group.</p>
          <p className="error-detail">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group-page">
      <header className="group-header">
        <div className="group-header-text">
          <h1>{group.name}</h1>
          <p className="group-summary">{group.summary}</p>
        </div>
      </header>

      <div className="group-body">
        {/* Specifications textbox — functionality implemented in 4B */}
        <section className="specs-section">
          <label htmlFor="specs-input" className="specs-label">
            Specifications
          </label>
          <input
            id="specs-input"
            className="specs-input"
            type="text"
            placeholder="e.g. Italian cuisine, 3 mains and 2 sides…"
            disabled
          />
          <p className="specs-hint">Filter logic coming in 4B</p>
        </section>

        {/* User recipe cards grid — populated in 4D & 4E */}
        <section className="cards-section">
          <h2 className="cards-heading">Group Members</h2>
          <div className="cards-grid">
            <div className="card-placeholder">
              <p>Member cards will appear here (4D)</p>
              <p className="placeholder-detail">Group ID: {groupId}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default GroupPage
