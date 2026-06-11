import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

// Loads dsa_problems.json (built by scripts/generate_dsa_problems.py) into
// CodingProblem + TestCase. Problems stay verified=false until
// scripts/verify-dsa.ts runs their reference solutions green through Judge0.

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  const jsonPath = path.join(__dirname, '..', 'prisma', 'data', 'dsa_problems.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 1. Coding topics
  const topicIdBySlug: Record<string, string> = {};
  let order = 1;
  for (const name of data.topics as string[]) {
    const slug = slugify(name);
    const t = await prisma.assessmentTopic.upsert({
      where: { slug },
      update: { name, category: 'CODING', order },
      create: { name, slug, category: 'CODING', order },
    });
    topicIdBySlug[slug] = t.id;
    order++;
  }
  console.log(`${Object.keys(topicIdBySlug).length} coding topics upserted`);

  // 2. Problems — wipe & reload (no attempts exist while the bank is being built)
  await prisma.attemptResponse.deleteMany({ where: { codingProblemId: { not: null } } });
  await prisma.testSectionItem.deleteMany({ where: { codingProblemId: { not: null } } });
  await prisma.testCase.deleteMany({});
  await prisma.codingProblem.deleteMany({});

  let problems = 0;
  let cases = 0;
  for (const p of data.problems) {
    const topicId = topicIdBySlug[p.topicSlug];
    if (!topicId) {
      console.warn(`  skipping ${p.slug}: unknown topic ${p.topicSlug}`);
      continue;
    }
    await prisma.codingProblem.create({
      data: {
        topicId,
        title: p.title,
        slug: p.slug,
        statement: p.statement,
        difficulty: p.difficulty,
        constraints: p.constraints,
        sampleIo: p.sampleIo,
        starterCode: p.starterCode,
        referenceSolution: p.referenceSolution,
        timeLimitMs: p.timeLimitMs,
        memoryLimitMb: p.memoryLimitMb,
        source: p.source,
        sourceUrl: p.sourceUrl,
        verified: false,
        testCases: {
          create: p.cases.map((c: any) => ({
            input: c.input,
            expectedOutput: c.expectedOutput,
            isSample: c.isSample,
            weight: 1,
          })),
        },
      },
    });
    problems++;
    cases += p.cases.length;
  }

  console.log(`Seeded ${problems} coding problems with ${cases} test cases (all verified=false).`);
  console.log('Next: start Judge0 (docker compose up -d) and run scripts/verify-dsa.ts');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('seed-dsa failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
