import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../../services/supabase'
import type { KnowledgeNode, UserProfile, ExtractionSettings } from '../../types/database'

export interface SettingsContextValue {
  profile: UserProfile | null
  extractionSettings: ExtractionSettings | null
  anchors: KnowledgeNode[]
  loading: boolean
  refreshAnchors: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [extractionSettings, setExtractionSettings] = useState<ExtractionSettings | null>(null)
  const [anchors, setAnchors] = useState<KnowledgeNode[]>([])
  const [loading, setLoading] = useState(true)

  const refreshAnchors = useCallback(async () => {
    const { data } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('is_anchor', true)
      .order('label')
    if (data) setAnchors(data as KnowledgeNode[])
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) setProfile(data as UserProfile)

    const { data: settings } = await supabase
      .from('extraction_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (settings) setExtractionSettings(settings as ExtractionSettings)
  }, [])

  useEffect(() => {
    Promise.all([refreshProfile(), refreshAnchors()]).finally(() => setLoading(false))
  }, [refreshProfile, refreshAnchors])

  return (
    <SettingsContext.Provider value={{ profile, extractionSettings, anchors, loading, refreshAnchors, refreshProfile }}>
      {children}
    </SettingsContext.Provider>
  )
}
