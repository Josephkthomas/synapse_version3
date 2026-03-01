import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import {
  createDigestProfile as createProfileService,
  updateDigestProfile as updateProfileService,
  deleteDigestProfile as deleteProfileService,
} from '../services/supabase'
import type { DigestProfile } from '../types/feed'
import type { DigestModuleInput, DigestChannelInput } from '../types/digest'

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
    status: 'scheduled' as const,
  }
}

interface UseDigestProfilesReturn {
  profiles: DigestProfile[]
  loading: boolean
  error: Error | null
  tableExists: boolean
  refresh: () => void
  create: (
    title: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    density: 'brief' | 'standard' | 'comprehensive',
    scheduleTime: string,
    scheduleTimezone: string,
    modules: DigestModuleInput[],
    channels: DigestChannelInput[]
  ) => Promise<string>
  update: (
    id: string,
    title: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    density: 'brief' | 'standard' | 'comprehensive',
    scheduleTime: string,
    scheduleTimezone: string,
    modules: DigestModuleInput[],
    channels: DigestChannelInput[]
  ) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useDigestProfiles(): UseDigestProfilesReturn {
  const [profiles, setProfiles] = useState<DigestProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tableExists, setTableExists] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true)

      // Attempt 1: full query with digest_modules join
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

      // Table truly does not exist
      if (fullError.code === '42P01') {
        setTableExists(false)
        setLoading(false)
        return
      }

      // Attempt 2: base table only
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('digest_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!fallbackError) {
        setProfiles((fallbackData ?? []).map(mapRawProfile))
        setLoading(false)
        return
      }

      if (
        fallbackError.code === '42P01' ||
        fallbackError.message?.includes('does not exist')
      ) {
        setTableExists(false)
        setLoading(false)
        return
      }

      setError(new Error(fallbackError.message))
      setLoading(false)
    }

    fetchProfiles()
  }, [tick])

  const create = useCallback(async (
    title: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    density: 'brief' | 'standard' | 'comprehensive',
    scheduleTime: string,
    scheduleTimezone: string,
    modules: DigestModuleInput[],
    channels: DigestChannelInput[]
  ): Promise<string> => {
    const id = await createProfileService(
      { title, frequency, density, schedule_time: scheduleTime, schedule_timezone: scheduleTimezone },
      modules,
      channels
    )
    refresh()
    return id
  }, [refresh])

  const update = useCallback(async (
    id: string,
    title: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    density: 'brief' | 'standard' | 'comprehensive',
    scheduleTime: string,
    scheduleTimezone: string,
    modules: DigestModuleInput[],
    channels: DigestChannelInput[]
  ): Promise<void> => {
    await updateProfileService(
      id,
      { title, frequency, density, schedule_time: scheduleTime, schedule_timezone: scheduleTimezone },
      modules,
      channels
    )
    refresh()
  }, [refresh])

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteProfileService(id)
    refresh()
  }, [refresh])

  return { profiles, loading, error, tableExists, refresh, create, update, remove }
}
