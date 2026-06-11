import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { runAgainstCases, runnerAvailable } from '../src/services/codeRunnerService';

// Runs every coding problem's Python reference solution against all of its
// test cases through Piston. All green -> verified=true.
//
// Usage: npx ts-node scripts/verify-dsa.ts [--slug problem-slug]

async function main() {
  if (!(await runnerAvailable())) {
    console.error('Piston is not reachable (PISTON_URL or http://localhost:2000).');
    console.error('Start it with: docker compose up -d   (from the repo root)');
    process.exit(1);
  }

  const slugArgIdx = process.argv.indexOf('--slug');
  const slug = slugArgIdx >= 0 ? process.argv[slugArgIdx + 1] : undefined;

  const problems = await prisma.codingProblem.findMany({
    where: slug ? { slug } : {},
    include: { testCases: true },
    orderBy: { title: 'asc' },
  });

  let green = 0;
  let red = 0;
  for (const p of problems) {
    const reference = (p.referenceSolution as any)?.python;
    if (!reference) {
      console.log(`  ${p.slug}: no python reference — skipped`);
      continue;
    }
    const results = await runAgainstCases(reference, 'python', p.testCases, {
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
    });
    const passed = results.filter((r) => r.passed).length;
    const ok = passed === p.testCases.length;
    await prisma.codingProblem.update({
      where: { id: p.id },
      data: { verified: ok },
    });
    if (ok) green++;
    else {
      red++;
      const firstFail = results.find((r) => !r.passed);
      console.log(
        `  FAIL ${p.slug}: ${passed}/${p.testCases.length} — case ${firstFail?.caseIndex}: ${firstFail?.status} ${firstFail?.stderr?.slice(0, 120) || ''}`
      );
    }
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${p.slug} (${passed}/${p.testCases.length})`);
  }

  console.log(`\n${green} problems verified, ${red} failed.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('verify-dsa failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
