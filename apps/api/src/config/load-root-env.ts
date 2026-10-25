import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const rootEnvPath = resolve(currentDirectory, '../../../../.env');

dotenv.config({ path: rootEnvPath, quiet: true });
