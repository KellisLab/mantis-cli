import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

export class FsCsvReader {
  readHeaders(file) {
    const input = fs.readFileSync(file, 'utf8');
    const rows = parse(input, { to_line: 1, relax_quotes: true });
    const headers = rows[0] || [];
    if (!headers.length) throw new Error('CSV has no header row.');
    return headers.map((h) => String(h).trim()).filter(Boolean);
  }
}
