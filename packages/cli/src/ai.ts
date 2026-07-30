import type { RunSummary, TriageReport, TriageSuggestion } from '@khyfee/deflake-core'

export async function maybeAiEnhance(summary: RunSummary, triage: TriageReport): Promise<TriageReport> {
  if (process.env.DEFLAKE_AI !== '1' || !process.env.OPENAI_API_KEY) return triage
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const prompt = {
    role: 'system',
    content:
      'You are Deflake. Return ONLY JSON matching {hypothesis,evidence[],suggested_patch,confidence,caveats[],class}. Cite only provided evidence. Never invent files. Never suggest arbitrary sleeps or removing assertions.',
  }
  const user = {
    role: 'user',
    content: JSON.stringify({
      outcome: summary.outcome,
      passRate: summary.passRate,
      clusters: summary.clusters.slice(0, 5),
      correlations: summary.correlations,
    }),
  }
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [prompt, user],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return triage
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content
    if (!content) return triage
    const parsed = JSON.parse(content) as TriageSuggestion
    if (!parsed.hypothesis || !Array.isArray(parsed.evidence) || !parsed.suggested_patch) return triage
    if (/sleep\s*\(|waitForTimeout|remove assertion|toBeTruthy\(\)/i.test(parsed.suggested_patch)) return triage
    return {
      ...triage,
      suggestions: [
        {
          ...parsed,
          confidence: Number(parsed.confidence) || 0.5,
          caveats: parsed.caveats || [],
          class: parsed.class || 'unknown',
          source: 'ai',
        },
        ...triage.suggestions,
      ],
    }
  } catch {
    return triage
  }
}
