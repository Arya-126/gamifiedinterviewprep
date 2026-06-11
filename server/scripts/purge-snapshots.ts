import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

// Retention: deletes proctoring snapshots (files + SNAPSHOT events) older than
// RETENTION_DAYS. Run manually or on a schedule.
//   npx ts-node scripts/purge-snapshots.ts [--days N]

const daysIdx = process.argv.indexOf('--days');
const RETENTION_DAYS = daysIdx >= 0 ? parseInt(process.argv[daysIdx + 1], 10) : 30;
const SNAPSHOT_DIR = path.join(__dirname, '..', 'uploads', 'proctoring');

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
  const old = await prisma.proctoringEvent.findMany({
    where: { type: 'SNAPSHOT', createdAt: { lt: cutoff } },
  });

  let filesDeleted = 0;
  for (const event of old) {
    const m = /\/attempts\/([^/]+)\/snapshots\/(\d+\.jpg)$/.exec(event.snapshotUrl || '');
    if (m) {
      const file = path.join(SNAPSHOT_DIR, m[1], m[2]);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        filesDeleted++;
      }
    }
  }
  const { count } = await prisma.proctoringEvent.deleteMany({
    where: { type: 'SNAPSHOT', createdAt: { lt: cutoff } },
  });

  // remove now-empty attempt directories
  if (fs.existsSync(SNAPSHOT_DIR)) {
    for (const dir of fs.readdirSync(SNAPSHOT_DIR)) {
      const full = path.join(SNAPSHOT_DIR, dir);
      if (fs.statSync(full).isDirectory() && fs.readdirSync(full).length === 0) {
        fs.rmdirSync(full);
      }
    }
  }

  console.log(`Purged ${count} snapshot events / ${filesDeleted} files older than ${RETENTION_DAYS} days.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('purge-snapshots failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
