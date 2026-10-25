import '../config/load-root-env.js';
import { loadConfig } from '../config/env.js';
import { disconnectDatabase, prisma } from '../db.js';

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required for the database smoke test.');
  const [companies, users, employees] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.employee.count()
  ]);
  console.log(JSON.stringify({ companies, users, employees }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
