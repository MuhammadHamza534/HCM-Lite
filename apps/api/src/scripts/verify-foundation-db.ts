import '../config/load-root-env.js';
import { Prisma } from '@prisma/client';
import { loadConfig } from '../config/env.js';
import { disconnectDatabase, prisma } from '../db.js';

const expectedTables = [
  'companies',
  'users',
  'departments',
  'designations',
  'employees',
  'company_settings_versions'
] as const;

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required for foundation database verification.');

  const [tableRows, counts] = await Promise.all([
    prisma.$queryRaw<Array<{ table_name: string }>>(Prisma.sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (${Prisma.join(expectedTables)})
      ORDER BY table_name
    `),
    Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.department.count(),
      prisma.designation.count(),
      prisma.employee.count(),
      prisma.companySettingsVersion.count()
    ])
  ]);

  const foundTables = tableRows.map((row) => row.table_name);
  if (foundTables.length !== expectedTables.length) throw new Error('Expected Phase 1 foundation tables were not all found.');
  if (counts.some((count) => count !== 0)) throw new Error('Foundation database must be empty before Phase 2.');

  console.log(JSON.stringify({ tables: foundTables, counts }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
