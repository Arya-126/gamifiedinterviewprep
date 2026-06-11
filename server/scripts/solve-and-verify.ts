import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { prisma } from '../src/lib/prisma';

// Solves unverified text-only MCQs with two independent LLM passes.
// Agreement  -> Option.isCorrect set, explanation stored, verified=true.
// Disagreement -> stays unverified, both proposals recorded for the review queue.
//
// Provider: Anthropic (claude-opus-4-8) when ANTHROPIC_API_KEY is set,
// otherwise falls back to Groq (llama-3.3-70b) — weaker on hard quant items,
// which is acceptable because disagreements land in the human review queue.
//
// Usage:
//   npx ts-node scripts/solve-and-verify.ts [--limit N] [--topic slug] [--concurrency N] [--redo]
//
// Resumable: questions with a proposedAnswer are skipped unless --redo is given.

const ANTHROPIC_MODEL = 'claude-opus-4-8';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = flag('limit') ? parseInt(flag('limit')!, 10) : undefined;
const TOPIC = flag('topic');
const CONCURRENCY = flag('concurrency') ? parseInt(flag('concurrency')!, 10) : 4;
const REDO = args.includes('--redo');

const useAnthropic = !!process.env.ANTHROPIC_API_KEY;
const MODEL = useAnthropic ? ANTHROPIC_MODEL : GROQ_MODEL;
const anthropic = useAnthropic ? new Anthropic() : null;
const groq = !useAnthropic
  ? new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 60_000, maxRetries: 2 })
  : null;

const ANSWER_SCHEMA = {
  type: 'object' as const,
  properties: {
    answer: { type: 'string', enum: LETTERS, description: 'Letter of the correct option' },
    explanation: {
      type: 'string',
      description: 'Concise step-by-step worked solution, including any formula used',
    },
  },
  required: ['answer', 'explanation'],
  additionalProperties: false,
};

interface SolveResult {
  answer: string;
  explanation: string;
}

function parseAnswer(text: string): SolveResult | null {
  try {
    // tolerate code fences / surrounding prose around the JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.answer === 'string' && LETTERS.includes(parsed.answer.toUpperCase())) {
      return { answer: parsed.answer.toUpperCase(), explanation: String(parsed.explanation || '') };
    }
  } catch {
    // fall through
  }
  return null;
}

async function solveOnce(prompt: string, framing: string, temperature = 0): Promise<SolveResult | null> {
  if (anthropic) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
      messages: [{ role: 'user', content: `${framing}\n\n${prompt}` }],
    } as any);
    const text = (response as any).content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    return parseAnswer(text);
  }

  // Groq free tier: 12k tokens/min — retry 429s with the server-suggested delay
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await groq!.chat.completions.create({
        model: MODEL,
        temperature,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You solve multiple-choice aptitude questions. Respond ONLY with a JSON object: ' +
              '{"answer": "<letter A-E of the correct option>", "explanation": "<brief solution, max 4 sentences>"}',
          },
          { role: 'user', content: `${framing}\n\n${prompt}` },
        ],
      });
      return parseAnswer(response.choices[0]?.message?.content || '');
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (e?.status === 429 || msg.includes('rate_limit')) {
        const m = msg.match(/try again in ([\d.]+)s/);
        const waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 15000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (msg.includes('json_validate_failed')) return null; // model rambled — count as failed pass
      throw e;
    }
  }
  return null;
}

function buildPrompt(q: {
  stem: string;
  assets: any;
  options: { text: string; order: number }[];
}): string {
  const context = q.assets?.context ? `Context/Directions:\n${q.assets.context}\n\n` : '';
  const opts = [...q.options]
    .sort((a, b) => a.order - b.order)
    .map((o, i) => `${LETTERS[i]}. ${o.text}`)
    .join('\n');
  return `${context}Question:\n${q.stem}\n\nOptions:\n${opts}`;
}

async function processQuestion(q: any): Promise<'verified' | 'disagreed' | 'failed'> {
  const prompt = buildPrompt(q);

  // pass B uses a different framing (and a different temperature on Groq) so
  // the two passes are not trivially identical
  const [passA, passB] = await Promise.all([
    solveOnce(
      prompt,
      'You are an expert aptitude exam solver. Solve the following multiple-choice question carefully and pick the single correct option.',
      0
    ),
    solveOnce(
      prompt,
      'You are a meticulous exam verifier. Independently re-derive the answer to this multiple-choice question from first principles, then eliminate the wrong options one by one before choosing.',
      0.5
    ),
  ]);

  if (!passA || !passB) return 'failed';

  const sorted = [...q.options].sort((a: any, b: any) => a.order - b.order);
  const idxA = LETTERS.indexOf(passA.answer);

  if (passA.answer === passB.answer && idxA >= 0 && idxA < sorted.length) {
    await prisma.$transaction([
      prisma.assessmentOption.updateMany({
        where: { questionId: q.id },
        data: { isCorrect: false },
      }),
      prisma.assessmentOption.update({
        where: { id: sorted[idxA].id },
        data: { isCorrect: true },
      }),
      prisma.assessmentQuestion.update({
        where: { id: q.id },
        data: {
          proposedAnswer: passA.answer,
          explanation: passA.explanation,
          verified: true,
        },
      }),
    ]);
    return 'verified';
  }

  // disagreement — keep unverified, surface both proposals to the review queue
  await prisma.assessmentQuestion.update({
    where: { id: q.id },
    data: {
      proposedAnswer: passA.answer,
      explanation: passA.explanation,
      assets: { ...(q.assets || {}), solverDisagreement: [passA.answer, passB.answer] },
    },
  });
  return 'disagreed';
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY) {
    console.error('Neither ANTHROPIC_API_KEY nor GROQ_API_KEY is set in server/.env — aborting.');
    process.exit(1);
  }
  console.log(`Provider: ${useAnthropic ? 'Anthropic' : 'Groq'} (${MODEL})`);

  const questions = await prisma.assessmentQuestion.findMany({
    where: {
      verified: false,
      type: 'SINGLE',
      ...(REDO ? {} : { proposedAnswer: null }),
      ...(TOPIC ? { topic: { slug: TOPIC } } : {}),
    },
    include: { options: true, topic: true },
    orderBy: { createdAt: 'asc' },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  // text-only, complete questions only — figures and short option sets go to humans
  const solvable = questions.filter((q) => {
    const a = q.assets as any;
    return !a?.requiresImage && !a?.incompleteOptions && q.options.length >= 3;
  });

  console.log(`Queue: ${solvable.length} solvable unverified questions (model: ${MODEL}, 2 passes each)`);

  let verified = 0;
  let disagreed = 0;
  let failed = 0;
  let done = 0;

  const queue = [...solvable];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const q = queue.shift()!;
      try {
        const result = await processQuestion(q);
        if (result === 'verified') verified++;
        else if (result === 'disagreed') disagreed++;
        else failed++;
      } catch (e: any) {
        failed++;
        console.error(`  error on ${q.topic.slug} q${(q.assets as any)?.handoutNumber}: ${e.message}`);
      }
      done++;
      if (done % 25 === 0) console.log(`  progress: ${done}/${solvable.length}`);
    }
  });
  await Promise.all(workers);

  const totals = {
    verified: await prisma.assessmentQuestion.count({ where: { verified: true } }),
    unverified: await prisma.assessmentQuestion.count({ where: { verified: false } }),
  };

  console.log('\n=== solve-and-verify report ===');
  console.log(`this run:   ${verified} verified, ${disagreed} disagreements, ${failed} failed`);
  console.log(`DB totals:  ${totals.verified} verified / ${totals.unverified} need review or images`);
  console.log('Disagreements + failures stay unverified — resolve them in the admin review queue.');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('solve-and-verify failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
