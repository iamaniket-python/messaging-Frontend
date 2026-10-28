import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { describeError } from '../api/errors.js';
import FormError from '../components/FormError.jsx';
import TextField from '../components/TextField.jsx';
import { btnPrimary, linkCls } from '../components/ui.js';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(describeError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-[400px] rounded-xl border border-border bg-panel p-7"
      >
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted">Sign in to continue</p>

        <FormError error={error} />

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className={`${btnPrimary} mt-5`} disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="mt-4 text-center text-muted">
          No account?{' '}
          <Link to="/register" className={linkCls}>
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
