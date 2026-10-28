import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { describeError } from '../api/errors.js';
import FormError from '../components/FormError.jsx';
import TextField from '../components/TextField.jsx';
import { btnPrimary, linkCls } from '../components/ui.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (password !== confirm) {
      setError({ message: 'Passwords do not match.', details: [] });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
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
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-muted">Join the conversation</p>

        <FormError error={error} />

        <TextField
          label="Name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button type="submit" className={`${btnPrimary} mt-5`} disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>

        <p className="mt-4 text-center text-muted">
          Already have an account?{' '}
          <Link to="/login" className={linkCls}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
