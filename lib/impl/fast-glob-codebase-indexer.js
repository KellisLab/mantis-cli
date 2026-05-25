import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { stringify } from 'csv-stringify/sync';

const DEFAULT_IGNORES = [
  '**/.git/**', '**/.next/**', '**/.turbo/**', '**/.venv/**', '**/__pycache__/**',
  '**/build/**', '**/coverage/**', '**/dist/**', '**/node_modules/**', '**/vendor/**',
  '**/*.lock', '**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock',
  '**/.DS_Store', '**/Thumbs.db',
];

const EXT_LANGUAGE = {
  '.css': 'css', '.go': 'go', '.html': 'html', '.java': 'java', '.js': 'javascript',
  '.jsx': 'javascript', '.json': 'json', '.md': 'markdown', '.py': 'python', '.rs': 'rust',
  '.scss': 'scss', '.sql': 'sql', '.ts': 'typescript', '.tsx': 'typescript', '.vue': 'vue',
  '.yaml': 'yaml', '.yml': 'yaml',
};

const SOURCE_EXTENSIONS = Object.keys(EXT_LANGUAGE);
const NULL_BYTE = String.fromCharCode(0);

function inferKind(rel) {
  const base = path.basename(rel).toLowerCase();
  if (base.includes('test') || base.includes('spec')) return 'test';
  if (rel.includes('/components/') || rel.includes('\\components\\')) return 'component';
  if (rel.includes('/pages/') || rel.includes('\\pages\\') || rel.includes('/app/')) return 'route';
  if (rel.includes('/api/') || rel.includes('\\api\\')) return 'api';
  if (rel.includes('/hooks/') || rel.includes('\\hooks\\')) return 'hook';
  if (rel.includes('/utils/') || rel.includes('\\utils\\') || rel.includes('/lib/')) return 'utility';
  return 'source';
}

function importsFrom(content) {
  const imports = new Set();
  const patterns = [
    /^\s*import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm,
    /^\s*import\s+['"]([^'"]+)['"]/gm,
    /^\s*const\s+.*?=\s+require\(['"]([^'"]+)['"]\)/gm,
    /^\s*from\s+([\w.]+)\s+import\s+/gm,
  ];
  for (const re of patterns) {
    for (const match of content.matchAll(re)) imports.add(match[1]);
  }
  return [...imports].slice(0, 40).join(', ');
}

function summarize(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const comment = lines.find((l) => /^\/\/|^#|^\/\*|^\*|^<!--/.test(l));
  return (comment || lines[0] || '').replace(/^\/\/|^#|^\/\*+|^\*|<!--|-->/g, '').trim().slice(0, 240);
}

function isBinaryBuffer(buf) {
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    if (b === 0) return true;
    if (b < 9 || (b > 13 && b < 32)) return true;
  }
  return false;
}

function readText(file, maxChars) {
  const buf = fs.readFileSync(file);
  if (isBinaryBuffer(buf)) return null;
  let raw = buf.toString('utf8');
  if (raw.indexOf(NULL_BYTE) !== -1) raw = raw.split(NULL_BYTE).join('');
  return raw.length > maxChars ? `${raw.slice(0, maxChars)}\n\n[truncated]` : raw;
}

export class FastGlobCodebaseIndexer {
  async index(rootDir, outFile, { maxChars = 12000, include } = {}) {
    const root = path.resolve(rootDir || process.cwd());
    const patterns = include?.length ? include : SOURCE_EXTENSIONS.map((ext) => `**/*${ext}`);
    const files = await fg(patterns, {
      cwd: root,
      absolute: true,
      dot: false,
      ignore: DEFAULT_IGNORES,
      onlyFiles: true,
    });

    const skipped = [];
    const rows = [];
    for (const file of files.sort()) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      const ext = path.extname(file).toLowerCase();
      const content = readText(file, maxChars);
      if (content === null) {
        skipped.push(rel);
        continue;
      }
      const stat = fs.statSync(file);
      rows.push({
        path: rel,
        file_name: path.basename(file),
        extension: ext.replace(/^\./, ''),
        language: EXT_LANGUAGE[ext] || ext.replace(/^\./, ''),
        kind: inferKind(rel),
        loc: content.split(/\r?\n/).length,
        bytes: stat.size,
        imports: importsFrom(content),
        summary: summarize(content),
        content,
      });
    }

    if (!rows.length) throw new Error(`No source files found in ${root}`);
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, stringify(rows, { header: true }));
    return { root, outFile: path.resolve(outFile), count: rows.length, skipped };
  }
}
