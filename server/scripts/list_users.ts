import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const all = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  console.log('All users:', JSON.stringify(all, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
