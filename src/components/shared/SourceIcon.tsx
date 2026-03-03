import { ProviderIcon } from './ProviderIcon'
import { getSourceConfig } from '../../config/sourceTypes'

interface SourceIconProps {
  sourceType: string | null | undefined
  provider?: string | null
  size?: number
}

export function SourceIcon({ sourceType, provider, size = 22 }: SourceIconProps) {
  return <ProviderIcon sourceType={sourceType} provider={provider} size={size} borderRadius={6} />
}

export function getSourceEmoji(sourceType: string | null | undefined): string {
  return getSourceConfig(sourceType).icon
}
