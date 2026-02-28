import { useContext } from 'react'
import { SettingsContext } from '../app/providers/SettingsProvider'

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === null) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
