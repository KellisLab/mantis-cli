import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Walk up from this module until we find the package root (the dir holding
// package.json + skills/). Depth-agnostic so it works both unbundled
// (lib/utils/, two levels deep) and bundled (dist/, one level deep).
function findPackageRoot(start) {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start, '../..'); // fallback: old behavior
    dir = parent;
  }
}

export const PACKAGE_ROOT = findPackageRoot(__dirname);
export const SKILLS_DIR = path.join(PACKAGE_ROOT, 'skills');
