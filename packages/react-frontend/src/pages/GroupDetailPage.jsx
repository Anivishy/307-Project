import { ArrowLeft, Bell, Check, ChefHat, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { GlassIconButton } from "../components/GlassIconButton.jsx";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { groups } from "../data/recipes.js";
import { getBundleCandidates, getGroupSettings, updateGroupSettings } from "../lib/groupApi.js";

const members = [
  { name: "Ani", role: "Scrum Master" },
  { name: "Vinayak", role: "Product Owner" },
  { name: "Kartik", role: "Tester" },
  { name: "Leon", role: "Lead Developer" },
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!group) {
      return undefined;
    }

    let isCancelled = false;

    async function loadGroupDetails() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [settingsPayload, candidatePayload] = await Promise.all([
          getGroupSettings(group.id),
          getBundleCandidates(group.id),
        ]);

        if (isCancelled) {
          return;
        }

        setSettings(settingsPayload);
        setCandidates(candidatePayload.candidates);
        setFilteredOutCount(candidatePayload.filteredOutCandidateCount);
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load group settings.");
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
    setErrorMessage("");

    try {
      const updatedSettings = await updateGroupSettings(group.id, nextValue);
      const updatedCandidates = await getBundleCandidates(group.id);

      setSettings(updatedSettings);
      setCandidates(updatedCandidates.candidates);
      setFilteredOutCount(updatedCandidates.filteredOutCandidateCount);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save group settings.");
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
        <Link className="detail-back-button" to="/groups" aria-label="Back to groups">
          <ArrowLeft size={22} />
        </Link>
        <GlassIconButton icon={Bell} label="Group notifications" className="detail-save-button" />
      </div>

      <article className="group-detail-panel">
        <div className="detail-handle" />
        <p className="eyebrow">{group.members} members</p>
        <h1>{group.name}</h1>
        <p className="recipe-detail-description">{group.description}</p>

        <section className="member-row" aria-label="Group members">
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
              {settings?.viewerRole === "admin" ? "Admin controls" : "Member view"}
            </span>
          </div>

          <div className="toggle-row">
            <div>
              <h3>Allow Missing Ingredients</h3>
              <p>
                Enable this when the group is okay with bundles that include shopping gaps. Disabled means missing
                ingredients block the candidate before it appears.
              </p>
            </div>

            <label
              className={`toggle-switch ${settings?.allowMissingIngredients ? "is-active" : ""} ${
                isSaving ? "is-busy" : ""
              }`}
            >
              <input
                type="checkbox"
                aria-label="Allow Missing Ingredients"
                checked={Boolean(settings?.allowMissingIngredients)}
                disabled={!settings || settings.viewerRole !== "admin" || isSaving}
                onChange={handleToggleChange}
              />
              <span className="toggle-switch__track">
                <span className="toggle-switch__thumb" />
              </span>
            </label>
          </div>

          <p className="settings-note">
            {settings?.allowMissingIngredients
              ? "Candidates can appear with shopping disclosures."
              : "Only pantry-feasible candidates are shown right now."}
          </p>

          {errorMessage && (
            <StatusMessage type="error" title="Settings unavailable" message={errorMessage} />
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
                  <span>{filteredOutCount} hidden while missing ingredients stay disabled</span>
                )}
              </div>

              <div className="bundle-grid">
                {candidates.map((candidate) => (
                  <article className="bundle-card" key={candidate.id}>
                    <div className="bundle-card__header">
                      <div>
                        <p className="eyebrow">Candidate Bundle</p>
                        <h3>{candidate.title}</h3>
                      </div>

                      {candidate.missingIngredients.length > 0 && (
                        <span className="bundle-card__badge">
                          <TriangleAlert size={16} /> Missing items
                        </span>
                      )}
                    </div>

                    <div className="spec-pills bundle-course-pills">
                      {candidate.courses.map((course) => (
                        <span key={`${candidate.id}-${course.type}`}>
                          <ChefHat size={14} /> {course.type}: {course.title}
                        </span>
                      ))}
                    </div>

                    <p className="bundle-rationale">{candidate.rationale}</p>

                    {candidate.missingIngredients.length > 0 && (
                      <section className="missing-items" aria-label={`Missing items for ${candidate.title}`}>
                        <h4>Missing Items</h4>
                        <ul>
                          {candidate.missingIngredients.map((item) => (
                            <li key={`${candidate.id}-${item.ingredientId}`}>{formatMissingItem(item)}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <div className="bundle-actions">
                      <button className="button" type="button">
                        <Sparkles size={18} /> Review Bundle
                      </button>
                      <Link className="button button--dark" to="/approvals">
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
