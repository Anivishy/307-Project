import { ArrowUpRight, Plus, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { groups } from "../data/recipes.js";

export function GroupsPage() {
  const hasGroups = groups.length > 0;

  return (
    <section className="screen groups-screen">
      <PageHeader
        eyebrow="Groups"
        title="Your Groups"
        subtitle="Open a group to see members, recipes, and ingredient requests."
        action="plus"
      />

      {!hasGroups ? (
        <EmptyState
          title="No groups yet"
          message="Create a group to start sharing pantry ingredients."
          action={
            <button className="button" type="button">
              <Plus size={18} /> Create Group
            </button>
          }
        />
      ) : (
        <div className="group-stack">
          {groups.map((group) => (
            <Link className="group-card" to={`/groups/${group.id}`} key={group.id}>
              <img src={group.image} alt={group.name} />
              <span className="group-card__shade" />
              <span className="group-card__open">
                <ArrowUpRight size={20} />
              </span>
              <span className="group-card__members">
                <UsersRound size={16} /> {group.members} members
              </span>
              <span className="group-card__content">
                <strong>{group.name}</strong>
                <small>{group.description}</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
