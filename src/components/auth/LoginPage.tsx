import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { SynapseLogo } from '../shared/SynapseLogo'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password)

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-content)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 380,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo mark */}
        <SynapseLogo size={48} />

        {/* Wordmark */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            marginTop: 12,
            marginBottom: 28,
          }}
        >
          Synapse
        </div>

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            outline: 'none',
            marginTop: 8,
          }}
        />

        {/* Error */}
        {error && (
          <div
            style={{
              width: '100%',
              fontSize: 12,
              color: 'var(--color-semantic-red-500)',
              marginTop: 8,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? 'var(--color-accent-400)' : 'var(--color-accent-500)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '11px 0',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: 16,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = 'var(--color-accent-600)'
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = 'var(--color-accent-500)'
          }}
        >
          {loading
            ? (isSignUp ? 'Creating account...' : 'Signing in...')
            : (isSignUp ? 'Create account' : 'Sign in')
          }
        </button>

        {/* Toggle */}
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginTop: 16,
          }}
        >
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent-500)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
            }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </form>
    </div>
  )
}
