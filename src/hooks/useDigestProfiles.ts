import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { DigestProfile } from '../types/feed'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRawProfile(p: any): DigestProfile {
  return {
    id: p.id ?? '',
    title: p.title ?? 'Untitled Briefing',
    frequency: (['daily', 'weekly', 'monthly'] as const).includes(p.frequency)
      ? p.frequency
      : 'weekly',
    isActive: p.is_active ?? false,
    scheduleTime: p.schedule_time ?? '09:00:00',
    scheduleTimezone: p.schedule_timezone ?? 'UTC',
    density: (['brief', 'standard', 'comprehensive'] as const).includes(p.density)
      ? p.density
      : 'standard',
    createdAt: p.created_at ?? new Date().toISOString(),
    modules: Array.isArray(p.digest_modules)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? p.digest_modules.map((m: any) => ({
          id: m.id ?? '',
          templateId: m.template_id ?? m.templateId ?? '',
          sortOrder: m.sort_order ?? m.sortOrder ?? 0,
          isActive: m.is_active ?? m.isActive ?? true,
        }))
      : [],
    // All active profiles shown as 'scheduled' until PRD 13 builds generation engine
    status: 'scheduled' as const,
  }
}

export function useDigestProfiles(): {
  profiles: DigestProfile[]
  loading: boolean
  error: Error | null
  tableExists: boolean
} {
  const [profiles, setProfiles] = useState<DigestProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tableExists, setTableExists] = useState(true)

  useEffect(() => {
    async function fetchProfiles() {
      // Attempt 1: full query with digest_modules join and all columns
      const { data, error: fullError } = await supabase
        .from('digest_profiles')
        .select(`
          id, title, frequency, is_active, schedule_time, schedule_timezone, density, created_at,
          digest_modules ( id, template_id, sort_order, is_active )
        `)
        .order('created_at', { ascending: false })

      if (!fullError) {
        setProfiles((data ?? []).map(mapRawProfile))
        setLoading(false)
        return
      }

      // Table truly does not exist → show empty state, no error shown to user
      if (fullError.code === '42P01') {
        setTableExists(false)
        setLoading(false)
        return
      }

      // Attempt 2: some column or the digest_modules relation may not exist yet.
      // Fall back to select('*') on the base table only.
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('digest_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!fallbackError) {
        setProfiles((fallbackData ?? []).map(mapRawProfile))
        setLoading(false)
        return
      }

      // Table really doesn't exist (caught by fallback)
      if (
        fallbackError.code === '42P01' ||
        fallbackError.message?.includes('does not exist')
      ) {
        setTableExists(false)
        setLoading(false)
        return
      }

      // Genuine error
      setError(new Error(fallbackError.message))
      setLoading(false)
    }

    fetchProfiles()
  }, [])

  return { profiles, loading, error, tableExists }
}
