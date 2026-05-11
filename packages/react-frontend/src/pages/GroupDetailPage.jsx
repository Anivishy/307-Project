import { ArrowLeft, Bell, Check, Sparkles, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { GlassIconButton } from "../components/GlassIconButton.jsx";
import { groups } from "../data/recipes.js";

const members = [
  { name: "Ani", role: "Scrum Master" },
  { name: "Vinayak", role: "Product Owner" },
  { name: "Kartik", role: "Tester" },
  { name: "Leon", role: "Lead Developer" },
];

export function GroupDetailPage() {
  const { groupId } = useParams();
  const group = groups.find((item) => item.id === groupId);

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

        <section className="generator-card surface-card">
          <div className="section-heading">
            <h2>Recipe Generator</h2>
            <Sparkles size={20} />
          </div>
          <div className="spec-pills">
            <span className="is-active">Italian</span>
            <span>Asian</span>
            <span>No nuts</span>
            <span>Vegetarian</span>
          </div>
          <label className="field">
            <span>Specs</span>
            <textarea defaultValue="Use eggs, rice, and one green vegetable." />
          </label>
          <div className="generator-actions">
            <button className="button" type="button">
              <Sparkles size={18} /> Generate
            </button>
            <Link className="button button--dark" to="/approvals">
              <Check size={18} /> Requests
            </Link>
          </div>
        </section>
      </article>
    </section>
  );
}
