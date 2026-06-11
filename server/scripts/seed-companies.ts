import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

// Seeds company pattern PROFILES — facts about round structure, topic emphasis
// and interview style. No copyrighted question text is stored or reproduced;
// company tests draw from our own question bank weighted by these profiles.

const COMPANIES = [
  {
    name: 'JP Morgan',
    slug: 'jp-morgan',
    notes:
      'Pattern profile compiled from publicly known placement-round structure. Tests are built from our own bank.',
    profile: {
      durationMinutes: 60,
      negativeMarking: 0.25,
      passScore: 60,
      rounds: [
        {
          title: 'Quantitative & Data Interpretation',
          kind: 'APTITUDE',
          category: 'QUANTITATIVE',
          strategy: 'RANDOM',
          count: 10,
          difficultyMix: { EASY: 0.2, MEDIUM: 0.5, HARD: 0.3 },
        },
        {
          title: 'Logical Reasoning',
          kind: 'LOGICAL',
          category: 'LOGICAL',
          strategy: 'RANDOM',
          count: 8,
          difficultyMix: { EASY: 0.25, MEDIUM: 0.5, HARD: 0.25 },
        },
        {
          title: 'Coding',
          kind: 'CODING',
          category: 'CODING',
          strategy: 'RANDOM',
          count: 1,
          marksPerQuestion: 10,
        },
      ],
      interviewStyle:
        'JP Morgan style: emphasize integrity, teamwork and client focus. Mix STAR behavioral questions with practical technology questions (data structures, SQL, system reliability). Probe for ownership of past work and comfort with high-pressure, detail-oriented environments. Professional, structured tone.',
    },
  },
  {
    name: 'Standard Chartered',
    slug: 'standard-chartered',
    notes:
      'Pattern profile compiled from publicly known placement-round structure. Tests are built from our own bank.',
    profile: {
      durationMinutes: 45,
      negativeMarking: 0,
      passScore: 55,
      rounds: [
        {
          title: 'Quantitative Aptitude',
          kind: 'APTITUDE',
          category: 'QUANTITATIVE',
          strategy: 'RANDOM',
          count: 8,
          difficultyMix: { EASY: 0.4, MEDIUM: 0.5, HARD: 0.1 },
        },
        {
          title: 'Verbal Ability',
          kind: 'VERBAL',
          category: 'VERBAL',
          strategy: 'RANDOM',
          count: 8,
        },
        {
          title: 'Logical Reasoning',
          kind: 'LOGICAL',
          category: 'LOGICAL',
          strategy: 'RANDOM',
          count: 6,
        },
      ],
      interviewStyle:
        'Standard Chartered style: values-led banking interview. Emphasize the bank\'s "valued behaviours" (do the right thing, better together, never settle), customer empathy, and interest in financial services. Behavioral questions dominate, with light technical questions about data handling and digital banking. Warm but probing tone.',
    },
  },
];

async function main() {
  for (const c of COMPANIES) {
    await prisma.company.upsert({
      where: { slug: c.slug },
      update: { name: c.name, notes: c.notes, profile: c.profile as any },
      create: { name: c.name, slug: c.slug, notes: c.notes, profile: c.profile as any },
    });
    console.log(`upserted company: ${c.name} (${c.profile.rounds.length} rounds)`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('seed-companies failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
