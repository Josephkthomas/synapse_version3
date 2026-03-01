import { useState } from 'react';
import { signIn } from '../lib/supabase';
import { SYNAPSE_APP_URL } from '../lib/constants';

interface LoginProps {
  onLogin: (userId: string, userEmail: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { userId, userEmail } = await signIn(email.trim(), password);
      onLogin(userId, userEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login">
      {/* Logo */}
      <div className="login-logo">
        <div className="logo-mark">S</div>
        <span className="logo-text">Synapse</span>
      </div>

      <h2 className="login-heading">Sign in to Synapse</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            required
          />
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !email.trim() || !password.trim()}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="login-footer">
        Don't have an account?{' '}
        <a href={SYNAPSE_APP_URL} target="_blank" rel="noopener noreferrer">
          Sign up at Synapse
        </a>
      </p>
    </div>
  );
}
