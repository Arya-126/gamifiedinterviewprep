import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

// Provider-abstracted chat completion. Anthropic (claude-opus-4-8) when
// ANTHROPIC_API_KEY is set; otherwise Groq (llama-3.3-70b).

const ANTHROPIC_MODEL = 'claude-opus-4-8';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
// Groq rate limits are per model — when the primary model's daily token quota
// is exhausted, fall back to a model with its own quota instead of failing.
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';

const useAnthropic = !!process.env.ANTHROPIC_API_KEY;
const anthropic = useAnthropic ? new Anthropic() : null;
const groq = !useAnthropic
  ? new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 60_000, maxRetries: 2 })
  : null;

export const llmProvider = useAnthropic ? `anthropic:${ANTHROPIC_MODEL}` : `groq:${GROQ_MODEL}`;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 1024;

  if (anthropic) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const turns = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      ...(system ? { system } : {}),
      messages: turns.length > 0 ? turns : [{ role: 'user', content: 'Begin.' }],
    } as any);
    return (response as any).content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
  }

  const groqCall = async (model: string) => {
    const response = await groq!.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: maxTokens,
      ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
      messages,
    });
    return response.choices[0]?.message?.content || '';
  };

  try {
    return await groqCall(GROQ_MODEL);
  } catch (e: any) {
    const msg = String(e?.message || '');
    if ((e?.status === 429 || msg.includes('rate_limit')) && GROQ_FALLBACK_MODEL !== GROQ_MODEL) {
      console.warn(`llmService: ${GROQ_MODEL} rate-limited, falling back to ${GROQ_FALLBACK_MODEL}`);
      return await groqCall(GROQ_FALLBACK_MODEL);
    }
    throw e;
  }
}

// Defensive JSON extraction — tolerates code fences and surrounding prose.
export function extractJson<T = any>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
