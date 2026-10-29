import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔄 Enabling and organizing all seeded coding problems...');

  // Set all to verified
  await prisma.codingProblem.updateMany({
    data: { verified: true },
  });

  // Fetch problems and their topic
  const problems = await prisma.codingProblem.findMany({
    include: { topic: true },
  });

  let updatedCount = 0;
  for (const p of problems) {
    let newTrack = p.track;
    let newLevel = p.level || 1;

    if (!newTrack) {
      // Use topic slug or infer from problem title / slug
      newTrack = p.topic?.slug || 'algorithms';
    }

    if (newLevel <= 0) {
      newLevel = p.difficulty === 'HARD' ? 3 : p.difficulty === 'MEDIUM' ? 2 : 1;
    }

    if (newTrack !== p.track || newLevel !== p.level) {
      await prisma.codingProblem.update({
        where: { id: p.id },
        data: { track: newTrack, level: newLevel },
      });
      updatedCount++;
    }
  }

  console.log(`✅ Normalized tracks and levels for ${updatedCount} problems`);

  const summary = await prisma.codingProblem.findMany({
    select: { track: true, level: true, title: true, difficulty: true },
  });

  const byTrack: Record<string, number> = {};
  for (const p of summary) {
    const t = p.track || 'general';
    byTrack[t] = (byTrack[t] || 0) + 1;
  }

  console.log('\nFinal Problems per Track:');
  for (const [t, c] of Object.entries(byTrack).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(25)}: ${c} problems`);
  }

  console.log(`\nTotal verified problems: ${summary.length}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
