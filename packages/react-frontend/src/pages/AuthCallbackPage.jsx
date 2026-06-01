import { Loader2, MailWarning } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import creamyPan from '../../assets/creamy-pan.jpg';
import { parseMagicLinkCallback } from '@/lib/authCallback.js';
import { completeMagicLinkSession } from '@/lib/authApi.js';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    tone: 'neutral',
    message: 'Finishing sign in...'
  });
  const callback = useMemo(
    () => parseMagicLinkCallback(window.location),
    []
  );

  useEffect(() => {
    let isMounted = true;

    async function finishSignIn() {
      if (!callback.ok) {
        setStatus({
          tone: 'error',
          message: callback.message
        });
        return;
      }

      try {
        await completeMagicLinkSession(callback.session);
        if (isMounted) {
          navigate('/groups', { replace: true });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            tone: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'This sign-in link could not be verified. Return to sign in and try again.'
          });
        }
      }
    }

    finishSignIn();

    return () => {
      isMounted = false;
    };
  }, [callback, navigate]);

  return (
    <div className="auth-shell">
      <main className="auth-frame auth-phone">
        <section className="auth-hero">
          <img src={creamyPan} alt="Creamy skillet dish" />
          <div className="auth-hero__shade" />
          <Link to="/" className="auth-back">
            RecipeCollab
          </Link>
        </section>

        <section className="auth-panel">
          <p className="eyebrow">Secure sign in</p>
          <h1 className="auth-title">
            {status.tone === 'error'
              ? 'Link needs a refresh.'
              : 'Opening your kitchen.'}
          </h1>
          <p className="auth-copy">{status.message}</p>

          <div
            className={`auth-status auth-status--${status.tone}`}>
            {status.tone === 'error' ? (
              <MailWarning size={18} />
            ) : (
              <Loader2 size={18} className="auth-spinner" />
            )}
            <span>{status.message}</span>
          </div>

          {status.tone === 'error' && (
            <Link className="button button--wide" to="/signin">
              Back to sign in
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
