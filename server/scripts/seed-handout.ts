import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

// Seeds the assessment taxonomy + the JV handout question bank.
//   1. python scripts/extract_handout.py   (PDF -> handout_questions.json)
//   2. npx ts-node scripts/seed-handout.ts (JSON -> Postgres)
// Every question lands with verified=false; answers come later from
// scripts/solve-and-verify.ts + the admin review queue.

type Category = 'QUANTITATIVE' | 'LOGICAL' | 'VERBAL' | 'CODING';

const TAXONOMY: Record<Category, string[]> = {
  QUANTITATIVE: [
    'Number System', 'Trailing Zeros/Factorials', 'HCF & LCM', 'Unit Digit', 'Factors',
    'Averages', 'Ratio & Proportion', 'Percentage', 'Time Speed & Distance',
    'Boats & Streams', 'Races', 'Time & Work', 'Pipes & Cisterns', 'Alligation & Mixture',
    'Partnership', 'Profit & Loss', 'Simple & Compound Interest', 'Ages', 'Algebra',
    'Geometry & Mensuration', 'Permutation & Combination', 'Probability', 'Set Theory',
  ],
  LOGICAL: [
    'Blood Relations', 'Direction Sense', 'Coding-Decoding', 'Clocks', 'Calendars',
    'Seating Arrangement', 'Number Series', 'Number Analogy', 'Statement & Assumptions',
    'Statement & Argument', 'Statement & Conclusion', 'Deductive Reasoning',
    'Cause & Effect', 'Course of Action', 'Logical Reasoning', 'Letter & Symbol Series',
    'Data Interpretation', 'Data Sufficiency', 'Alphanumeric', 'Syllogism',
    'Cryptarithmetic', 'Machine Input/Output', 'Binary Logic', 'Flowchart',
    'Cubes & Dice', 'Visual Sequence',
  ],
  VERBAL: [
    'Reading Comprehension', 'Sentence Correction', 'Sentence Improvement',
    'Sentence Completion', 'Spotting Errors', 'Fill in the Blanks', 'Antonyms',
    'Synonyms', 'One-word Substitution', 'Verbal Analogy', 'Verbal Classification',
    'Jumbled Sentences', 'Logical Sequence of Words',
  ],
  CODING: [], // populated in Phase 3 by seed-dsa.ts
};

const SOURCE = 'JV Global Services LLP — Student handout (B2 course materials, 60hr)';

interface ExtractedQuestion {
  category: Category;
  topic: string;
  topicSlug: string;
  page: number;
  number: number;
  stem: string;
  context: string | null;
  options: { letter: string; text: string }[];
  requiresImage: boolean;
  incomplete: boolean;
  legendOptions: boolean;
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  const jsonPath = path.join(__dirname, '..', 'prisma', 'data', 'handout_questions.json');
  const questions: ExtractedQuestion[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 1. Taxonomy
  console.log('Seeding assessment topic taxonomy...');
  const topicIdBySlug: Record<string, string> = {};
  for (const [category, names] of Object.entries(TAXONOMY) as [Category, string[]][]) {
    let order = 1;
    for (const name of names) {
      const slug = slugify(name);
      const t = await prisma.assessmentTopic.upsert({
        where: { slug },
        update: { name, category, order },
        create: { name, slug, category, order },
      });
      topicIdBySlug[slug] = t.id;
      order++;
    }
  }
  console.log(`  ${Object.keys(topicIdBySlug).length} topics upserted`);

  // 2. Questions — wipe & reload (no attempts exist while the bank is being built)
  console.log('Reloading handout questions...');
  await prisma.attemptResponse.deleteMany({ where: { questionId: { not: null } } });
  await prisma.testSectionItem.deleteMany({ where: { questionId: { not: null } } });
  await prisma.assessmentOption.deleteMany({});
  await prisma.assessmentQuestion.deleteMany({});

  let inserted = 0;
  let skippedNoTopic = 0;
  for (const q of questions) {
    const topicId = topicIdBySlug[q.topicSlug];
    if (!topicId) {
      skippedNoTopic++;
      continue;
    }
    const assets: Record<string, unknown> = { page: q.page, handoutNumber: q.number };
    if (q.context) assets.context = q.context;
    if (q.requiresImage) assets.requiresImage = true;
    if (q.incomplete) assets.incompleteOptions = true;
    if (q.legendOptions) assets.legendOptions = true;

    await prisma.assessmentQuestion.create({
      data: {
        topicId,
        type: 'SINGLE',
        difficulty: 'MEDIUM',
        stem: q.stem,
        assets: assets as any,
        source: SOURCE,
        verified: false,
        options: {
          create: q.options.map((o, i) => ({ text: o.text, isCorrect: false, order: i })),
        },
      },
    });
    inserted++;
  }

  // 3. Admin user for the review queue
  const passwordHash = await bcrypt.hash('password', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'ADMIN' },
    create: { name: 'Admin', email: 'admin@example.com', passwordHash, role: 'ADMIN' },
  });

  // 4. Report
  const total = await prisma.assessmentQuestion.count();
  const needImage = questions.filter((q) => q.requiresImage).length;
  const incomplete = questions.filter((q) => q.incomplete).length;
  console.log('\n=== Seed report ===');
  console.log(`questions inserted:   ${inserted} (skipped, unknown topic: ${skippedNoTopic})`);
  console.log(`in DB now:            ${total}`);
  console.log(`verified:             0 (run scripts/solve-and-verify.ts next)`);
  console.log(`need image (figures): ${needImage}`);
  console.log(`incomplete options:   ${incomplete}`);
  console.log('admin login:          admin@example.com / password');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('seed-handout failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
