import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const scriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const rootEnvPath = resolve(scriptDirectory, '../../../../.env');
dotenv.config({ path: rootEnvPath, quiet: true });

const command = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const child = spawn(command, process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32'
});
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', () => process.exit(1));
