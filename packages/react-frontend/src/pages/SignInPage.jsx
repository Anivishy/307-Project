import { KeyRound, Mail, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import creamyPan from '../../assets/creamy-pan.jpg';
import {
  signInWithPassword,
  signUpWithPassword
} from '../lib/authApi.js';

export function SignInPage({ mode = 'signin' }) {
  const isSignUp = mode === 'signup';
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [serverTone, setServerTone] = useState('neutral');

  const formStatus = useMemo(() => {
    if (serverMessage) {
      return {
        tone: serverTone,
        message: serverMessage
      };
    }

    if (touched && !form.email.includes('@')) {
      return {
        tone: 'error',
        message: 'Enter a valid email address.'
      };
    }

    return {
      tone: 'neutral',
      message: isSignUp
        ? 'Create a password to keep your pantry and groups connected.'
        : 'Sign in with your email and password.'
    };
  }, [
    form.email,
    isSignUp,
    serverMessage,
    serverTone,
    touched
  ]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setServerMessage('');
    setServerTone('neutral');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    setServerMessage('');
    setServerTone('neutral');

    if (!form.email.includes('@')) {
      return;
    }

    if (isSignUp && !form.name.trim()) {
      setServerMessage('Enter your name.');
      setServerTone('error');
      return;
    }

    if (form.password.length < 8) {
      setServerMessage('Password must be at least 8 characters.');
      setServerTone('error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const payload = await signUpWithPassword({
          email: form.email,
          password: form.password,
          displayName: form.name.trim()
        });
        if (payload.requiresEmailConfirmation) {
          setServerMessage(
            `If ${payload.email} is new, check your inbox to confirm the account. If you already signed up, sign in with your password.`
          );
          setServerTone('success');
          return;
        }
      } else {
        await signInWithPassword({
          email: form.email,
          password: form.password
        });
      }
      navigate('/groups', { replace: true });
    } catch (error) {
      setServerMessage(
        error instanceof Error
          ? error.message
          : isSignUp
            ? 'We could not create your account. Try again shortly.'
            : 'We could not sign you in. Check your email and password.'
      );
      setServerTone('error');
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
          <p className="eyebrow">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </p>
          <h1 className="auth-title">
            {isSignUp
              ? 'Start cooking together.'
              : 'Your group dinner starts here.'}
          </h1>
          <p className="auth-copy">
            {isSignUp
              ? 'Create your account with an email and password. If email confirmation is enabled, check your inbox before signing in.'
              : 'Use your password to get back to saved recipes, pantry items, and group meals.'}
          </p>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate>
            <label className="auth-field auth-field--icon">
              <span>Email address</span>
              <Mail size={20} />
              <input
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
              />
            </label>

            {isSignUp && (
              <label className="auth-field auth-field--icon">
                <span>Name</span>
                <User size={20} />
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="Your name"
                />
              </label>
            )}

            <label className="auth-field auth-field--icon">
              <span>Password</span>
              <KeyRound size={20} />
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder="At least 8 characters"
              />
            </label>

            <p
              className={`auth-status auth-status--${formStatus.tone}`}>
              {formStatus.message}
            </p>

            <button
              className="button button--wide"
              type="submit"
              disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </button>

            <p className="auth-switch">
              {isSignUp
                ? 'Already have an account?'
                : 'New here?'}{' '}
              <Link to={isSignUp ? '/signin' : '/signup'}>
                {isSignUp ? 'Sign in' : 'Create account'}
              </Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
