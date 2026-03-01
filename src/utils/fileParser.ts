export const FILE_SIZE_LIMITS = {
  WARNING_BYTES: 10 * 1024 * 1024,   // 10MB
  MAX_BYTES: 50 * 1024 * 1024,       // 50MB
  MAX_CONTENT_CHARS: 100_000,         // ~25,000 words
} as const

const SUPPORTED_FORMATS = ['pdf', 'docx', 'md', 'txt', 'csv'] as const

// --- File Validation ---

export function validateFile(file: File): { valid: boolean; error?: string; warning?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!extension || !(SUPPORTED_FORMATS as readonly string[]).includes(extension)) {
    return {
      valid: false,
      error: `Unsupported format: .${extension ?? 'unknown'}. Supported: PDF, DOCX, Markdown, Plain text, CSV`,
    }
  }

  if (file.size > FILE_SIZE_LIMITS.MAX_BYTES) {
    return { valid: false, error: 'File exceeds 50MB limit. Please split into smaller documents.' }
  }

  if (file.size > FILE_SIZE_LIMITS.WARNING_BYTES) {
    return { valid: true, warning: 'Large file — extraction may take a moment.' }
  }

  return { valid: true }
}

// --- Text Extraction ---

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'txt':
    case 'md':
    case 'csv':
      return file.text()

    case 'pdf':
      return extractPDFText(file)

    case 'docx':
      return extractDOCXText(file)

    default:
      throw new Error(`Unsupported format: .${extension}`)
  }
}

// --- PDF Extraction (dynamic CDN import) ---

async function extractPDFText(file: File): Promise<string> {
  // Dynamically load pdf.js from CDN
  // @ts-expect-error — dynamic CDN import has no type declarations
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const textParts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: { str: string }) => item.str)
      .join(' ')
    textParts.push(pageText)
  }

  const fullText = textParts.join('\n\n')

  if (!fullText.trim()) {
    throw new Error('No extractable text — PDF may be an image scan. OCR is not supported.')
  }

  return fullText
}

// --- DOCX Extraction ---

async function extractDOCXText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
