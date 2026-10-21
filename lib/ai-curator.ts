import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SocrataRecord, MapSighting } from './types'
import { classifyComplaintType, rawToSighting } from './311-api'

const SYSTEM_PROMPT = `You are a NYC infrastructure analyst. Given a list of 311 complaints, select the 10 most severe and impactful issues affecting NYC residents.

For each selected sighting, assign:
- severity: "CRITICAL" (life/safety risk, major infrastructure failure), "HIGH" (significant impact, blocks access or causes damage), or "NOTABLE" (worth tracking, quality-of-life issue)
- title: short punchy headline (max 8 words), comic-book style
- description: 1–2 sentences, factual and urgent in tone

Prioritize: complaints affecting many people, dangerous conditions, long-unresolved issues, and high-impact boroughs.

Return ONLY a valid JSON array of exactly 10 objects with these fields: id, title, description, severity`

interface CuratorOutput {
  id: string
  title: string
  description: string
  severity: 'CRITICAL' | 'HIGH' | 'NOTABLE'
}

function parseJson(text: string): CuratorOutput[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array in response')
  return JSON.parse(match[0]) as CuratorOutput[]
}

async function curateWithClaude(prompt: string): Promise<CuratorOutput[]> {
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseJson(text)
}

async function curateWithGemini(prompt: string): Promise<CuratorOutput[]> {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${prompt}`)
  return parseJson(result.response.text())
}

export async function curateTopSightings(records: SocrataRecord[]): Promise<MapSighting[]> {
  // Build rule-based sightings for all records upfront
  const allSightings = records
    .filter(r => r.latitude && r.longitude)
    .map(rawToSighting)

  // Only send 50 records to AI — enough to pick 10, far cheaper than 200
  const compressed = records.slice(0, 50).map(r => ({
    id: r.unique_key,
    t: r.complaint_type,
    d: r.descriptor.slice(0, 40),
    a: r.incident_address,
    b: r.borough,
    s: r.status,
    c: r.created_date.split('T')[0],
  }))

  const prompt = `${compressed.length} NYC 311 complaints. Pick the 10 most severe:\n${JSON.stringify(compressed)}`

  let curated: CuratorOutput[] = []
  try {
    curated = await curateWithClaude(prompt)
  } catch (err) {
    console.warn('[curator] Claude failed, trying Gemini fallback:', (err as Error).message)
    try {
      curated = await curateWithGemini(prompt)
    } catch (err2) {
      console.error('[curator] Gemini fallback also failed:', err2)
    }
  }

  // Build enhancement map from AI top-10
  const enhancements = new Map(
    curated
      .filter(c => c.id)
      .slice(0, 10)
      .map(c => [c.id, c])
  )

  // Apply AI enhancements to matching sightings; rest keep rule-based data
  return allSightings.map(s => {
    const ai = enhancements.get(s.id)
    if (!ai) return s
    return {
      ...s,
      title: ai.title,
      description: ai.description,
      severity: ai.severity,
      category: classifyComplaintType(s.rawComplaintType),
    }
  })
}
