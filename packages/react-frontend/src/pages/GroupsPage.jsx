import { ArrowUpRight, KeyRound, Plus, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { groupImages } from "../data/recipes.js";
import { createGroup, getGroups, joinGroup } from "../lib/groupApi.js";
import { getSavedSession } from "../lib/session.js";

export function GroupsPage() {
  const [groupList, setGroupList] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("Invite codes connect members to the same shared pantry.");
  const hasGroups = groupList.length > 0;

  useEffect(() => {
    const session = getSavedSession();

    if (!session?.profileId) {
      return;
    }

    let isCancelled = false;

    async function loadGroups() {
      try {
        const payload = await getGroups();

        if (!isCancelled) {
          setGroupList(
            payload.groups.map((group, index) => ({
              ...group,
              image: groupImages[index % groupImages.length],
              description: group.description || "Shared pantry group.",
            })),
          );
          setStatusMessage("Groups loaded from /api/groups using your signed-in profile.");
        }
      } catch (error) {
        if (!isCancelled) {
          setStatusMessage(error instanceof Error ? error.message : "Unable to load groups from backend.");
        }
      }
    }

    void loadGroups();

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleCreateGroup(event) {
    event.preventDefault();
    const trimmedName = newGroupName.trim();

    if (!trimmedName) {
      setStatusMessage("Group name is required.");
      return;
    }

    async function createBackendGroup() {
      try {
        const createdGroup = await createGroup({
          name: trimmedName,
          description: "New shared pantry group.",
        });
        const displayGroup = {
          ...createdGroup,
          image: groupImages[0],
          description: createdGroup.description || "New shared pantry group.",
        };

        setGroupList((current) => [displayGroup, ...current]);
        setStatusMessage(`${trimmedName} created in Supabase. Share ${createdGroup.inviteCode}.`);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to create group.");
      } finally {
        setNewGroupName("");
      }
    }

    void createBackendGroup();
  }

  function handleJoinGroup(event) {
    event.preventDefault();
    const normalizedCode = joinCode.trim().toUpperCase();
    const alreadyJoined = groupList.find((group) => group.inviteCode === normalizedCode);

    if (alreadyJoined) {
      setStatusMessage(`You are already in ${alreadyJoined.name}. Duplicate joins are blocked.`);
      return;
    }

    async function joinBackendGroup() {
      try {
        const joinedGroup = await joinGroup(normalizedCode);
        setGroupList((current) => [
          {
            ...joinedGroup,
            image: groupImages[1],
            description: joinedGroup.description || "Shared pantry group.",
          },
          ...current,
        ]);
        setStatusMessage(`Joined ${joinedGroup.name} through /api/groups/join as a member.`);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Invite code not found.");
      } finally {
        setJoinCode("");
      }
    }

    void joinBackendGroup();
  }

  return (
    <section className="screen groups-screen">
      <PageHeader
        eyebrow="Groups"
        title="Your Groups"
        subtitle="Open a group to see members, recipes, and ingredient requests."
        action="plus"
      />

      <section className="group-control-card surface-card">
        <form onSubmit={handleCreateGroup}>
          <div className="section-heading">
            <h2>Create Group</h2>
            <Plus size={20} />
          </div>
          <label className="field">
            <span>Group name</span>
            <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} />
          </label>
          <button className="button button--wide" type="submit">
            <Plus size={18} /> Create Group
          </button>
        </form>

        <form onSubmit={handleJoinGroup}>
          <div className="section-heading">
            <h2>Join Group</h2>
            <KeyRound size={20} />
          </div>
          <label className="field">
            <span>Invite code</span>
            <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} />
          </label>
          <button className="button button--dark button--wide" type="submit">
            <KeyRound size={18} /> Join Group
          </button>
        </form>

        <p className="group-status">{statusMessage}</p>
      </section>

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
          {groupList.map((group) => (
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
                <small>
                  {group.role} | {group.inviteCode} | {group.description}
                </small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
