import { queryGraph } from './rag'
import { fetchDigestHistory } from './supabase'
import { getTemplateById } from '../config/digestTemplates'
import type { DigestProfile } from '../types/feed'
import type { DigestOutput, ModuleOutput } from '../types/digest'

const DENSITY_INSTRUCTIONS: Record<string, string> = {
  brief: 'Respond in 2–3 sentences. Focus on the single most important finding only.',
  standard: 'Respond in 1–2 paragraphs. Cover key findings with enough context to be actionable.',
  comprehensive: 'Provide detailed analysis in 3–4 paragraphs. Include supporting evidence, related entities, and specific recommendations.',
}

export async function generateDigest(
  profile: DigestProfile,
  userId: string,
  options?: {
    densityOverride?: string
    onModuleProgress?: (current: number, total: number, name: string) => void
  }
): Promise<DigestOutput> {
  const startTime = Date.now()
  const density = options?.densityOverride ?? profile.density ?? 'standard'
  const activeModules = profile.modules.filter(m => m.isActive)

  // Load recent history for deduplication context
  let recentThemes = ''
  try {
    const recentHistory = await fetchDigestHistory(profile.id, 3)
    recentThemes = recentHistory
      .map(h => h.executive_summary)
      .filter(Boolean)
      .join(' ')
      .substring(0, 500)
  } catch {
    // Not critical — continue without deduplication context
  }

  const moduleOutputs: ModuleOutput[] = []

  for (let i = 0; i < activeModules.length; i++) {
    const mod = activeModules[i]
    if (!mod) continue

    // ── Custom agent module ──────────────────────────────────────────────────
    if (mod.templateId === 'custom_agent') {
      let customConfig: { name?: string; task?: string; behavior?: string; goal?: string; outputFormat?: string } = {}
      try { customConfig = JSON.parse(mod.customContext ?? '{}') } catch { continue }
      if (!customConfig.task?.trim()) continue

      const moduleName = customConfig.name?.trim() || 'Custom Agent'
      options?.onModuleProgress?.(i + 1, activeModules.length, moduleName)
      const moduleStart = Date.now()

      try {
        let query = customConfig.task
        if (customConfig.behavior?.trim()) query += `\n\nApproach: ${customConfig.behavior}`
        if (customConfig.goal?.trim()) query += `\n\nGoal: ${customConfig.goal}`
        if (customConfig.outputFormat?.trim()) {
          query += `\n\nFormat your response exactly as follows: ${customConfig.outputFormat}. Preserve this format precisely — do not wrap it in standard module headings or additional structure.`
        }
        const densityInstruction = DENSITY_INSTRUCTIONS[density] ?? DENSITY_INSTRUCTIONS.standard
        query += `\n\n${densityInstruction}`
        if (recentThemes) {
          query += `\n\nRecent digest themes (avoid repetition, focus on new developments): ${recentThemes}`
        }

        const result = await queryGraph(query, userId, [])
        moduleOutputs.push({
          templateId: mod.templateId,
          templateName: moduleName,
          content: result.answer,
          citations: result.citations,
          relatedNodes: result.relatedNodes,
          generationDurationMs: Date.now() - moduleStart,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        moduleOutputs.push({
          templateId: mod.templateId,
          templateName: moduleName,
          content: 'This module encountered an error during generation.',
          citations: [],
          relatedNodes: [],
          generationDurationMs: Date.now() - moduleStart,
          error: message,
        })
      }
      continue
    }

    // ── Standard template module ─────────────────────────────────────────────
    const template = getTemplateById(mod.templateId)
    if (!template) continue

    options?.onModuleProgress?.(i + 1, activeModules.length, template.name)

    const moduleStart = Date.now()

    try {
      let query = template.systemPrompt
      if (mod.templateId && template.defaultContext) {
        // hint included via systemPrompt already
      }
      const densityInstruction = DENSITY_INSTRUCTIONS[density] ?? DENSITY_INSTRUCTIONS.standard
      query += `\n\n${densityInstruction}`
      if (recentThemes) {
        query += `\n\nRecent digest themes (avoid repetition, focus on new developments): ${recentThemes}`
      }

      // queryGraph requires userId and conversationHistory; pass [] for non-conversational modules
      const result = await queryGraph(query, userId, [])

      moduleOutputs.push({
        templateId: mod.templateId,
        templateName: template.name,
        content: result.answer,
        citations: result.citations,
        relatedNodes: result.relatedNodes,
        generationDurationMs: Date.now() - moduleStart,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      moduleOutputs.push({
        templateId: mod.templateId,
        templateName: template.name,
        content: 'This module encountered an error during generation.',
        citations: [],
        relatedNodes: [],
        generationDurationMs: Date.now() - moduleStart,
        error: message,
      })
    }
  }

  // Generate executive summary from all module outputs
  let executiveSummary = ''
  const successfulModules = moduleOutputs.filter(m => !m.error)

  if (successfulModules.length > 0) {
    options?.onModuleProgress?.(activeModules.length, activeModules.length, 'Executive Summary')
    try {
      const summaryContext = successfulModules
        .map(m => `[${m.templateName}]: ${m.content}`)
        .join('\n\n')

      const summaryQuery = `Given these intelligence module outputs from my knowledge graph, write a 2–3 sentence executive summary highlighting the most important findings and any cross-module patterns:\n\n${summaryContext}`

      const summaryResult = await queryGraph(summaryQuery, userId, [])
      executiveSummary = summaryResult.answer
    } catch {
      executiveSummary = 'Executive summary generation failed. Review individual modules below.'
    }
  } else {
    executiveSummary = 'All modules encountered errors. Check that your knowledge graph has sufficient data.'
  }

  return {
    profileId: profile.id,
    title: profile.title,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    modules: moduleOutputs,
    totalDurationMs: Date.now() - startTime,
  }
}
