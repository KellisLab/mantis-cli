import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = path.resolve(__dirname, '../..');
export const SKILLS_DIR = path.join(PACKAGE_ROOT, 'skills');
