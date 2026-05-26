import { KeyRound, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { getGroupPreview, joinGroup } from '../lib/groupApi.js';
import { getSavedSession } from '../lib/session.js';

export function JoinGroupPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!inviteCode) {
      setStatus('error');
      setErrorMessage('No invite code in the link.');
      return;
    }

    let isCancelled = false;

    async function loadPreview() {
      try {
        const data = await getGroupPreview(inviteCode.toUpperCase());
        if (!isCancelled) {
          setPreview(data);
          setStatus('ready');
        }
      } catch (error) {
        if (!isCancelled) {
          setStatus('error');
          setErrorMessage(
            error instanceof Error ? error.message : 'Invite link not found.'
          );
        }
      }
    }

    void loadPreview();
    return () => { isCancelled = true; };
  }, [inviteCode]);

  async function handleJoin() {
    const session = getSavedSession();
    if (!session?.profileId) {
      navigate(`/signin?redirect=/join/${inviteCode}`);
      return;
    }

    setIsJoining(true);
    setErrorMessage('');

    try {
      const joined = await joinGroup(inviteCode.toUpperCase());
      navigate(`/groups/${joined.id}`, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join group.';
      if (message.toLowerCase().includes('already')) {
        navigate(`/groups/${preview.id}`, { replace: true });
      } else {
        setErrorMessage(message);
        setIsJoining(false);
      }
    }
  }

  if (status === 'loading') {
    return (
      <section className="screen" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <StatusMessage type="loading" title="Looking up invite" message="Finding the group for this invite code…" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="screen" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <StatusMessage type="error" title="Invite not found" message={errorMessage} />
        <a className="button" href="/groups">Back to Groups</a>
      </section>
    );
  }

  return (
    <section className="screen" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <KeyRound size={40} style={{ opacity: 0.6 }} />
        <p className="eyebrow">You've been invited</p>
        <h1 style={{ margin: 0 }}>{preview.name}</h1>
        {preview.description && (
          <p style={{ opacity: 0.7 }}>{preview.description}</p>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', opacity: 0.6 }}>
          <UsersRound size={16} /> {preview.members} {preview.members === 1 ? 'member' : 'members'}
        </span>
        <code style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem', background: 'rgba(0,0,0,0.08)', borderRadius: '6px' }}>
          {inviteCode?.toUpperCase()}
        </code>
      </div>

      {errorMessage && (
        <StatusMessage type="error" title="Could not join" message={errorMessage} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '320px' }}>
        <button
          className="button button--wide"
          type="button"
          onClick={handleJoin}
          disabled={isJoining}
        >
          <KeyRound size={18} /> {isJoining ? 'Joining…' : 'Join Group'}
        </button>
        <a className="button button--dark button--wide" href="/groups">
          Back to Groups
        </a>
      </div>
    </section>
  );
}
