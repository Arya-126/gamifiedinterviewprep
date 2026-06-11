// Throwaway end-to-end check of the attempt lifecycle against a running server.
const BASE = process.env.API || 'http://localhost:4100';

async function api(method: string, path: string, token?: string, body?: any) {
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`${method} ${path} -> ${resp.status}: ${JSON.stringify(data)}`);
  return data as any;
}

async function main() {
  const { token } = await api('POST', '/auth/login', undefined, {
    email: 'student@example.com',
    password: 'password',
  });

  const tests = await api('GET', '/assessments/available', token);
  const test = tests.find((t: any) => t.title.startsWith('Full Mock'));
  console.log(`test: ${test.title} | sections: ${test.sections.map((s: any) => s.kind).join(',')}`);

  const attempt = await api('POST', `/assessments/${test.id}/start`, token);
  const items = attempt.items;
  console.log(`attempt ${attempt.attemptId} | items: ${items.length} | remainingSec: ${attempt.remainingSec}`);
  const perSection: Record<string, number> = {};
  for (const i of items) perSection[i.sectionTitle] = (perSection[i.sectionTitle] || 0) + 1;
  console.log('  per section:', JSON.stringify(perSection));

  // answer the first 5 MCQs with the FIRST option, flag one
  const mcqs = items.filter((i: any) => i.kind === 'question').slice(0, 5);
  for (const [idx, item] of mcqs.entries()) {
    await api('POST', `/assessments/attempts/${attempt.attemptId}/responses`, token, {
      kind: 'question',
      itemId: item.id,
      answer: [item.content.options[0].id],
      flagged: idx === 0,
      timeSpentSec: 12,
    });
  }
  console.log(`saved ${mcqs.length} answers (first flagged)`);

  // resume: payload must contain the saved responses + same snapshot
  const resumed = await api('GET', `/assessments/attempts/${attempt.attemptId}`, token);
  console.log(
    `resume ok: items=${resumed.items.length} responses=${resumed.responses.length} flagged=${resumed.responses.filter((r: any) => r.flagged).length}`
  );
  if (resumed.items.length !== items.length) throw new Error('snapshot changed between loads!');
  if (resumed.items[0].id !== items[0].id) throw new Error('snapshot order changed!');

  // start again must RESUME, not create a second attempt
  const again = await api('POST', `/assessments/${test.id}/start`, token);
  if (again.attemptId !== attempt.attemptId) throw new Error('start created a duplicate attempt!');
  console.log('re-start resumes the same attempt ✔');

  // submit + review
  const review = await api('POST', `/assessments/attempts/${attempt.attemptId}/submit`, token);
  console.log(`submitted: score=${review.score}% status=${review.status}`);
  console.log('  breakdown sections:', JSON.stringify((review.breakdown as any).sections));
  const answered = review.items.filter((i: any) => i.chosen);
  console.log(
    `  review: ${answered.length} answered, correct=${answered.filter((i: any) => i.isCorrect).length}, ` +
      `marks sample=${answered.map((i: any) => i.marks).join(',')}`
  );

  // saving after submit must fail
  try {
    await api('POST', `/assessments/attempts/${attempt.attemptId}/responses`, token, {
      kind: 'question',
      itemId: mcqs[0].id,
      answer: [mcqs[0].content.options[1].id],
    });
    throw new Error('save after submit should have failed!');
  } catch (e: any) {
    if (String(e.message).includes('should have failed')) throw e;
    console.log('post-submit save correctly rejected ✔');
  }

  console.log('\nE2E ATTEMPT FLOW: ALL CHECKS PASSED');
}

main().catch((e) => {
  console.error('E2E FAILED:', e.message);
  process.exit(1);
});
