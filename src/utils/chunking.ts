/**
 * Splits source content into ~500-token passages for RAG retrieval.
 * Uses sentence-boundary awareness with overlap for context continuity.
 */
export function chunkSourceContent(
  content: string,
  targetTokens: number = 500
): string[] {
  if (!content || !content.trim()) return []

  // Rough approximation: 1 token ≈ 4 characters for English text
  const targetChars = targetTokens * 4
  const overlapChars = 100 // ~25 token overlap for context continuity

  // Split into sentences (handles .!? endings)
  const sentences = content.match(/[^.!?]+[.!?]+/g)
  if (!sentences) {
    // No sentence boundaries found — return entire content if it's meaningful
    const trimmed = content.trim()
    return trimmed.length >= 50 ? [trimmed] : trimmed.length > 0 ? [trimmed] : []
  }

  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > targetChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      // Start new chunk with overlap from the end of the previous chunk
      const overlapStart = Math.max(0, currentChunk.length - overlapChars)
      currentChunk = currentChunk.substring(overlapStart) + sentence
    } else {
      currentChunk += sentence
    }
  }

  // Push the final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  // Merge very small chunks (< 100 chars) with the previous chunk
  const merged: string[] = []
  for (const chunk of chunks) {
    if (merged.length > 0 && chunk.length < 100) {
      merged[merged.length - 1] += ' ' + chunk
    } else {
      merged.push(chunk)
    }
  }

  return merged.filter(c => c.length > 0)
}
