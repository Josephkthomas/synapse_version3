import { useState, useCallback } from 'react'
import { parsePlaylistUrl } from '../../services/youtube'

interface ConnectPlaylistFormProps {
  onConnect: (url: string) => Promise<void>
  disabled?: boolean
}

export function ConnectPlaylistForm({ onConnect, disabled }: ConnectPlaylistFormProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleBlur = useCallback(() => {
    if (url.trim() && !parsePlaylistUrl(url)) {
      setError('Invalid playlist URL. Use a YouTube playlist link or a playlist ID starting with PL.')
    }
  }, [url])

  const handleSubmit = useCallback(async () => {
    if (!url.trim() || isConnecting) return
    setError(null)

    if (!parsePlaylistUrl(url)) {
      setError('Invalid playlist URL. Use a YouTube playlist link or a playlist ID starting with PL.')
      return
    }

    setIsConnecting(true)
    try {
      await onConnect(url)
      setUrl('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect playlist'
      setError(msg)
    } finally {
      setIsConnecting(false)
    }
  }, [url, isConnecting, onConnect])

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '16px 22px',
        marginBottom: 16,
      }}
    >
      {/* Section label */}
      <div
        className="font-display font-bold"
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--color-text-secondary)',
          marginBottom: 10,
        }}
      >
        Connect Playlist
      </div>

      {/* Form row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(null) }}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="Paste YouTube playlist URL..."
          disabled={disabled || isConnecting}
          className="font-body flex-1"
          style={{
            fontSize: 13,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(214,58,0,0.3)'
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-50)'
          }}
          onFocusCapture={undefined}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = ''
            e.currentTarget.style.boxShadow = ''
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!url.trim() || isConnecting || disabled}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 12,
            padding: '10px 20px',
            borderRadius: 8,
            background: '#1a1a1a',
            border: 'none',
            color: 'white',
            opacity: !url.trim() || isConnecting ? 0.4 : 1,
            cursor: !url.trim() || isConnecting ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="font-body" style={{ fontSize: 11, color: 'var(--color-semantic-red-500)', marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  )
}
