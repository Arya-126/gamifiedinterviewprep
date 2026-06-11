import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

// Prints row counts for every table in the public schema.
// Usage: npx ts-node scripts/db-health.ts
async function main() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename
  `;

  console.log('DB health — row counts (learndb @ public)\n');
  let width = Math.max(...tables.map((t) => t.tablename.length));
  for (const { tablename } of tables) {
    const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "${tablename}"`
    );
    console.log(`${tablename.padEnd(width)}  ${count}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('db-health failed:', e.message);
  process.exit(1);
});
