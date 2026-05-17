import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import creamyPan from "../../assets/creamy-pan.jpg";
import { requestEmailOtp, verifyEmailOtp } from "../lib/authApi.js";

export function SignInPage({ mode = "signin" }) {
  const isSignUp = mode === "signup";
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", otp: "" });
  const [step, setStep] = useState("email");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpPreview, setOtpPreview] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const [serverTone, setServerTone] = useState("neutral");

  const formStatus = useMemo(() => {
    if (!touched) {
      return {
        tone: "neutral",
        message: "Your pantry and group data stay connected after OTP login.",
      };
    }

    if (!form.email.includes("@")) {
      return { tone: "error", message: "Enter a valid email address." };
    }

    if (serverMessage && serverTone === "error") {
      return { tone: "error", message: serverMessage };
    }

    if (step === "otp" && form.otp.length !== 6) {
      return { tone: "error", message: "Enter the 6-digit OTP from the email preview." };
    }

    return {
      tone: "success",
      message:
        step === "otp"
          ? serverMessage || "OTP ready to verify against the backend."
          : serverMessage || `OTP ready to send to ${form.email}.`,
    };
  }, [form.email, form.otp, serverMessage, serverTone, step, touched]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    setServerMessage("");
    setServerTone("neutral");

    if (!form.email.includes("@")) {
      return;
    }

    if (step === "email") {
      setIsSubmitting(true);
      try {
        const payload = await requestEmailOtp(form.email);
        setOtpPreview(payload.otpPreview ?? "");
        setStep("otp");
        setServerMessage("OTP requested from /api/auth/email-otp/request.");
        setServerTone("success");
      } catch (error) {
        setServerMessage(error instanceof Error ? error.message : "Unable to request OTP.");
        setServerTone("error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmailOtp({
        email: form.email,
        otp: form.otp,
        displayName: form.name || "Kartik",
      });
      navigate("/groups", { replace: true });
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Unable to verify OTP.");
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
              ? "Create an account with a one-time email code to build a pantry and join groups."
              : "Sign in with a one-time email code to access saved recipes and group meals."}
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

            {step === "otp" && (
              <label className="auth-field auth-field--icon">
                <span>One-time code</span>
                <KeyRound size={20} />
                <input
                  name="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.otp}
                  onChange={updateField}
                  placeholder={otpPreview || "000000"}
                />
              </label>
            )}

            <div className="auth-options">
              <span>
                <ShieldCheck size={16} /> Session persists after refresh
              </span>
              {step === "otp" && (
                <button type="button" onClick={() => setStep("email")}>
                  Change email
                </button>
              )}
            </div>

            <p className={`auth-status auth-status--${formStatus.tone}`}>{formStatus.message}</p>

            <button className="button button--wide" type="submit">
              {isSubmitting ? "Please wait..." : step === "email" ? "Request OTP" : "Verify OTP"}
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
