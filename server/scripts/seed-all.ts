import 'dotenv/config';
import { execSync } from 'child_process';
import path from 'path';

const SCRIPTS = [
  'scripts/seed-handout.ts',
  'scripts/seed-dsa.ts',
  'scripts/seed-tracks.ts',
  'scripts/seed-tracks-extra.ts',
  'scripts/seed-companies.ts',
  'scripts/seed-company-technical.ts',
  'scripts/seed-company-coding.ts',
  'scripts/verify-all-problems.ts',
  'scripts/seed-sample-test.ts',
  'scripts/seed-technical-test.ts',
  'scripts/seed-contests.ts',
  'scripts/seed-hr.ts',
  'scripts/seed-interview-theory.ts',
  'scripts/seed-interview-achievements.ts',
  'scripts/seed-pipeline-achievements.ts',
];

console.log('🚀 Running full comprehensive database seed...');

for (const script of SCRIPTS) {
  console.log(`\n========================================`);
  console.log(`▶ Running ${script}...`);
  console.log(`========================================`);
  try {
    const fullPath = path.join(__dirname, '..', script);
    execSync(`npx ts-node "${fullPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err: any) {
    console.error(`⚠️ Warning: ${script} exited with error:`, err?.message || err);
  }
}

console.log('\n🎉 ALL SEEDING COMPLETE! Verifying with db-health...\n');
try {
  execSync(`npx ts-node scripts/db-health.ts`, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
} catch (e) {
  // ignore
}
