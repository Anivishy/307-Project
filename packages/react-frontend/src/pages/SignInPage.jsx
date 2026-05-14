import { Check, Lock, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import creamyPan from "../../assets/creamy-pan.jpg";

export function SignInPage({ mode = "signin" }) {
  const isSignUp = mode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState(false);

  const formStatus = useMemo(() => {
    if (!touched) {
      return {
        tone: "neutral",
        message: "Your pantry and group data stay connected after login.",
      };
    }

    if (!form.email.includes("@")) {
      return { tone: "error", message: "Enter a valid email address." };
    }

    if (form.password.length < 6) {
      return { tone: "error", message: "Password needs at least 6 characters." };
    }

    return {
      tone: "success",
      message: isSignUp ? "Account preview looks ready." : "Login preview looks ready.",
    };
  }, [form.email, form.password, isSignUp, touched]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
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
              ? "Create an account to build a pantry, join groups, and save recipes."
              : "Sign in to access saved recipes, ingredient requests, and group meals."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isSignUp && (
              <label className="auth-field">
                <span>Name</span>
                <input name="name" value={form.name} onChange={updateField} placeholder="Kartik" />
              </label>
            )}
            <label className="auth-field auth-field--icon">
              <span>Email address</span>
              <Mail size={20} />
              <input name="email" value={form.email} onChange={updateField} placeholder="kartik@example.com" />
            </label>
            <label className="auth-field auth-field--icon">
              <span>Password</span>
              <Lock size={20} />
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder="At least 6 characters"
              />
            </label>

            <div className="auth-options">
              <span>
                <Check size={16} /> Remember me
              </span>
              <Link to="/signin">Forgot?</Link>
            </div>

            <p className={`auth-status auth-status--${formStatus.tone}`}>{formStatus.message}</p>

            <button className="button button--wide" type="submit">
              {isSignUp ? "Create Account" : "Sign In"}
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
