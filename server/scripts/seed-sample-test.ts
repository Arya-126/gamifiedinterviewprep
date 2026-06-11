import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

// Seeds one published PRACTICE mock test exercising every selection strategy.
// Idempotent: replaces the test with the same title.

const TITLE = 'Full Mock — Aptitude + Coding (90 min)';

async function main() {
  const existing = await prisma.assessmentTest.findFirst({ where: { title: TITLE } });
  if (existing) {
    await prisma.attemptResponse.deleteMany({ where: { attempt: { testId: existing.id } } });
    await prisma.proctoringEvent.deleteMany({ where: { attempt: { testId: existing.id } } });
    await prisma.testAttempt.deleteMany({ where: { testId: existing.id } });
    await prisma.testSectionItem.deleteMany({ where: { section: { testId: existing.id } } });
    await prisma.testSection.deleteMany({ where: { testId: existing.id } });
    await prisma.assessmentTest.delete({ where: { id: existing.id } });
  }

  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });

  const test = await prisma.assessmentTest.create({
    data: {
      title: TITLE,
      description:
        'Placement-style mock: one question from every quantitative topic, 10 logical, 10 verbal, and one coding problem.',
      durationMinutes: 90,
      mode: 'PRACTICE',
      randomizeOrder: false,
      negativeMarking: 0.25,
      passScore: 50,
      status: 'PUBLISHED',
      createdById: admin?.id,
      sections: {
        create: [
          {
            title: 'Quantitative Aptitude',
            kind: 'APTITUDE',
            order: 0,
            marksPerQuestion: 1,
            selectionRule: {
              strategy: 'ONE_PER_TOPIC',
              category: 'QUANTITATIVE',
              verifiedOnly: false,
            },
          },
          {
            title: 'Logical Reasoning',
            kind: 'LOGICAL',
            order: 1,
            marksPerQuestion: 1,
            selectionRule: { strategy: 'RANDOM', category: 'LOGICAL', count: 10, verifiedOnly: false },
          },
          {
            title: 'Verbal Ability',
            kind: 'VERBAL',
            order: 2,
            marksPerQuestion: 1,
            selectionRule: { strategy: 'RANDOM', category: 'VERBAL', count: 10, verifiedOnly: false },
          },
          {
            title: 'Coding',
            kind: 'CODING',
            order: 3,
            marksPerQuestion: 10,
            selectionRule: { strategy: 'RANDOM', category: 'CODING', count: 1, verifiedOnly: true },
          },
        ],
      },
    },
    include: { sections: true },
  });

  console.log(`Seeded + published: "${test.title}" (${test.sections.length} sections, id ${test.id})`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('seed-sample-test failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
