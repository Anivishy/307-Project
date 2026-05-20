import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import creamyPan from "../../assets/creamy-pan.jpg";
import { checkAccountStatus, createSupabaseAccount, sendMagicLink, syncProfileSession } from "../lib/authApi.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateForm(form, isSignUp) {
  const email = normalizeEmail(form.email);

  if (isSignUp && !form.name.trim()) {
    return "Name is required.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Enter a valid email address.";
  }

  if (isSignUp && form.password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return "";
}

export function SignInPage({ mode = "signin" }) {
  const isSignUp = mode === "signup";
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [serverTone, setServerTone] = useState("neutral");

  const formStatus = useMemo(() => {
    if (!touched) {
      return {
        tone: "neutral",
        message: isSignUp
          ? "Confirmation emails open the app and finish account setup."
          : "Magic links open the app and take you to your groups.",
      };
    }

    const validationError = validateForm(form, isSignUp);

    if (validationError) {
      return { tone: "error", message: validationError };
    }

    if (serverMessage && serverTone === "error") {
      return { tone: "error", message: serverMessage };
    }

    return {
      tone: serverTone === "success" ? "success" : "neutral",
      message: serverMessage || (isSignUp ? "Ready to create your account." : "Ready to send your magic link."),
    };
  }, [form, isSignUp, serverMessage, serverTone, touched]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    setServerMessage("");
    setServerTone("neutral");

    const validationError = validateForm(form, isSignUp);

    if (validationError) {
      return;
    }

    const email = normalizeEmail(form.email);

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const account = await createSupabaseAccount({
          name: form.name.trim(),
          email,
          password: form.password,
        });

        if (account.session?.access_token) {
          await syncProfileSession({
            accessToken: account.session.access_token,
            displayName: form.name.trim(),
          });
          navigate("/groups", { replace: true });
          return;
        }

        const accountStatus = await checkAccountStatus(email);

        if (accountStatus.exists) {
          throw new Error("An account already exists for this email. Sign in instead.");
        }

        setServerMessage("Check your email to confirm your account. The link will open your groups page.");
        setServerTone("success");
        return;
      }

      const accountStatus = await checkAccountStatus(email);

      if (!accountStatus.exists) {
        throw new Error("No account exists for this email yet. Create an account first.");
      }

      await sendMagicLink(email);
      setServerMessage("Check your email for a magic link. It will open your groups page.");
      setServerTone("success");
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Unable to continue with email auth.");
      setServerTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <p className="eyebrow">{isSignUp ? "Create account" : "Welcome back"}</p>
          <h1 className="auth-title">{isSignUp ? "Start cooking together." : "Your group dinner starts here."}</h1>
          <p className="auth-copy">
            {isSignUp
              ? "Create an account with your name, email, and password. Supabase will send a confirmation link."
              : "Sign in with a secure email magic link to access your saved groups and shared pantry."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isSignUp && (
              <label className="auth-field auth-field--icon">
                <span>Name</span>
                <UserRound size={20} />
                <input name="name" value={form.name} onChange={updateField} placeholder="Kartik" />
              </label>
            )}
            <label className="auth-field auth-field--icon">
              <span>Email address</span>
              <Mail size={20} />
              <input name="email" value={form.email} onChange={updateField} placeholder="kartik@example.com" />
            </label>

            {isSignUp && (
              <label className="auth-field auth-field--icon">
                <span>Password</span>
                <LockKeyhole size={20} />
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="At least 8 characters"
                />
              </label>
            )}

            <div className="auth-options">
              <span>
                <ShieldCheck size={16} /> Session persists after refresh
              </span>
            </div>

            <p className={`auth-status auth-status--${formStatus.tone}`}>{formStatus.message}</p>

            <button className="button button--wide" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Send magic link"}
            </button>
          </form>

          <p className="auth-switch">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <Link to={isSignUp ? "/signin" : "/signup"}>{isSignUp ? "Sign in" : "Create account"}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
