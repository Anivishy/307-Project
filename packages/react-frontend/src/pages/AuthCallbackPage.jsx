import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { completeAuthRedirect } from "../lib/authApi.js";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const hasCompleted = useRef(false);
  const [status, setStatus] = useState({
    tone: "neutral",
    message: "Finishing secure email sign-in...",
  });

  useEffect(() => {
    if (hasCompleted.current) {
      return;
    }

    hasCompleted.current = true;

    async function finishAuth() {
      try {
        await completeAuthRedirect();
        setStatus({
          tone: "success",
          message: "Signed in. Opening your groups...",
        });
        navigate("/groups", { replace: true });
      } catch (error) {
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to finish email sign-in.",
        });
      }
    }

    void finishAuth();
  }, [navigate]);

  return (
    <div className="auth-shell">
      <main className="auth-callback-panel">
        <ShieldCheck size={28} />
        <p className="eyebrow">Email verified</p>
        <h1 className="auth-title">Opening RecipeCollab.</h1>
        <p className={`auth-status auth-status--${status.tone}`}>{status.message}</p>
        {status.tone === "error" && (
          <Link className="button button--wide" to="/signin">
            Back to sign in
          </Link>
        )}
      </main>
    </div>
  );
}
