import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getGraphStats } from '../../services/supabase'

interface StatusBarProps {
  hasError?: boolean
}

export function StatusBar({ hasError = false }: StatusBarProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState<{ nodeCount: number; chunkCount: number } | null>(null)

  useEffect(() => {
    if (!user) return
    getGraphStats(user.id)
      .then(s => setStats({ nodeCount: s.nodeCount, chunkCount: s.chunkCount }))
      .catch(err => console.warn('[StatusBar] Failed to fetch stats:', err))
  }, [user])

  const isEmpty = stats !== null && stats.nodeCount === 0
  const dotColor = hasError ? '#f59e0b' : isEmpty ? 'var(--color-text-secondary)' : '#10b981'
  const pulseSpeed = hasError ? '1s' : '2s'

  const label = hasError
    ? 'RAG Degraded — Check connection'
    : isEmpty
    ? 'No knowledge yet — ingest content to start querying'
    : 'Graph RAG Active'

  return (
    <div
      className="shrink-0 flex items-center font-body"
      style={{
        height: 44,
        padding: '0 24px',
        background: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 10,
      }}
    >
      <style>{`
        @keyframes rag-pulse {
          0% { opacity: 1 }
          50% { opacity: 0.6 }
          100% { opacity: 1 }
        }
      `}</style>

      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          animation: `rag-pulse ${pulseSpeed} ease infinite`,
          flexShrink: 0,
        }}
      />

      <span
        className="font-semibold"
        style={{ fontSize: 12, color: 'var(--color-text-primary)' }}
      >
        {label}
      </span>

      {stats && !isEmpty && !hasError && (
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          · {stats.nodeCount.toLocaleString()} nodes · {stats.chunkCount.toLocaleString()} chunks
        </span>
      )}
    </div>
  )
}
