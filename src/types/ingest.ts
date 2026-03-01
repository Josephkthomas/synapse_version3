export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  format: FileFormat
  status: 'ready' | 'extracting' | 'extracted' | 'failed'
  extractedText?: string
  error?: string
  warning?: string
}

export type FileFormat = 'pdf' | 'docx' | 'md' | 'txt' | 'csv'

export interface IntegrationConfig {
  id: string
  name: string
  icon: string
  description: string
  status: 'connected' | 'not_connected'
  setupInstructions: string[]
  comingSoon: boolean
}

export interface MeetingSource {
  title: string
  transcript: string
  meeting_date: string
  participants: string
}
