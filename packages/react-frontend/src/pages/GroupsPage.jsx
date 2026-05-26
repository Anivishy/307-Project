import { ArrowUpRight, Check, Copy, KeyRound, Link as LinkIcon, Plus, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { groupImages } from "../data/recipes.js";
import { createGroup, getGroups, joinGroup } from "../lib/groupApi.js";
import { getSavedSession } from "../lib/session.js";

function buildInviteLink(inviteCode) {
  return `${window.location.origin}/join/${inviteCode}`;
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <button className="button button--dark" type="button" onClick={handleCopy} title={label}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function GroupsPage() {
  const [groupList, setGroupList] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [newlyCreated, setNewlyCreated] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const session = getSavedSession();
    if (!session?.profileId) return;

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
            }))
          );
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load groups.");
        }
      }
    }

    void loadGroups();
    return () => { isCancelled = true; };
  }, []);

  // Pre-fill join code if coming from a link
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) setJoinCode(codeFromUrl.toUpperCase());
  }, [searchParams]);

  function handleCreateGroup(event) {
    event.preventDefault();
    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      setErrorMessage("Group name is required.");
      return;
    }

    setErrorMessage("");

    async function createBackendGroup() {
      try {
        const createdGroup = await createGroup({
          name: trimmedName,
          description: newGroupDescription.trim() || "Shared pantry group.",
        });
        const displayGroup = {
          ...createdGroup,
          image: groupImages[0],
          description: createdGroup.description || "Shared pantry group.",
        };

        setGroupList((current) => [displayGroup, ...current]);
        setNewlyCreated(createdGroup);
        setNewGroupName("");
        setNewGroupDescription("");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to create group.");
      }
    }

    void createBackendGroup();
  }

  function handleJoinGroup(event) {
    event.preventDefault();
    const normalizedCode = joinCode.trim().toUpperCase();
    const alreadyJoined = groupList.find((group) => group.inviteCode === normalizedCode);

    if (alreadyJoined) {
      setErrorMessage(`You are already in ${alreadyJoined.name}.`);
      return;
    }

    setErrorMessage("");

    async function joinBackendGroup() {
      try {
        const joinedGroup = await joinGroup(normalizedCode);
        setGroupList((current) => [
          {
            ...joinedGroup,
            image: groupImages[current.length % groupImages.length],
            description: joinedGroup.description || "Shared pantry group.",
          },
          ...current,
        ]);
        setJoinCode("");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Invite code not found.");
      }
    }

    void joinBackendGroup();
  }

  const hasGroups = groupList.length > 0;

  return (
    <section className="screen groups-screen">
      <PageHeader
        eyebrow="Groups"
        title="Your Groups"
        subtitle="Open a group to see members, recipes, and ingredient requests."
      />

      <section className="group-control-card surface-card">
        <form onSubmit={handleCreateGroup}>
          <div className="section-heading">
            <h2>Create Group</h2>
            <Plus size={20} />
          </div>
          <label className="field">
            <span>Group name</span>
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="e.g. Saturday Dinner Club"
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <input
              value={newGroupDescription}
              onChange={(event) => setNewGroupDescription(event.target.value)}
              placeholder="What's this group for?"
            />
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
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="e.g. DINNER-AB12"
            />
          </label>
          <button className="button button--dark button--wide" type="submit">
            <KeyRound size={18} /> Join Group
          </button>
        </form>

        {errorMessage && (
          <p className="group-status group-status--error">{errorMessage}</p>
        )}
      </section>

      {newlyCreated && (
        <section className="group-invite-card surface-card">
          <div className="section-heading">
            <h2>Share "{newlyCreated.name}"</h2>
            <Check size={20} />
          </div>
          <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
            Share the code or link below so others can join your group.
          </p>
          <div className="invite-code-row">
            <code className="invite-code">{newlyCreated.inviteCode}</code>
            <CopyButton text={newlyCreated.inviteCode} label="Copy Code" />
            <CopyButton text={buildInviteLink(newlyCreated.inviteCode)} label="Copy Link" />
          </div>
        </section>
      )}

      {!hasGroups ? (
        <EmptyState
          title="No groups yet"
          message="Create a group to start sharing pantry ingredients, or ask a friend for their invite code."
          action={null}
        />
      ) : (
        <div className="group-stack">
          {groupList.map((group) => (
            <div key={group.id} className="group-card-wrapper">
              <Link className="group-card" to={`/groups/${group.id}`}>
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
                  <small>{group.role} · {group.description}</small>
                </span>
              </Link>
              {group.role === "Admin" && group.inviteCode && (
                <div className="group-card-invite">
                  <code className="invite-code invite-code--small">{group.inviteCode}</code>
                  <CopyButton text={group.inviteCode} label="Code" />
                  <CopyButton text={buildInviteLink(group.inviteCode)} label="Link" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
