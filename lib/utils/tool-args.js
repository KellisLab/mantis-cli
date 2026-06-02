import fs from 'node:fs';

export function parseToolArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--args' || a === '--args-file') {
      const val = argv[i + 1];
      // never silently default to {} — an empty arg blob on a mutating tool
      // (e.g. filter_to_bag) means "no filter" = match everything, which
      // quietly bags the whole map. Fail loudly instead.
      if (val === undefined || val.startsWith('--')) {
        throw new Error(
          `${a} requires a ${a === '--args-file' ? 'file path' : 'JSON value'}.`,
        );
      }
      i++;
      const raw = a === '--args-file' ? fs.readFileSync(val, 'utf8') : val;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        const hint =
          a === '--args'
            ? ' On Windows PowerShell the shell often strips the inner quotes from'
              + ' --args \'{"k":"v"}\'; write the JSON to a file and pass'
              + ' --args-file <path> instead.'
            : '';
        throw new Error(`Could not parse ${a} as JSON: ${e.message}.${hint}`);
      }
      Object.assign(args, parsed);
      continue;
    }
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-/g, '_');
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[key] = coerceValue(next);
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function coerceValue(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

export function parseUseCommand(argv) {
  const idx = argv.indexOf('use');
  if (idx === -1 || !argv[idx + 1]) {
    throw new Error('Usage: mantis use <tool> [--args JSON | --args-file path] [--key value ...]');
  }
  return {
    tool: argv[idx + 1],
    args: parseToolArgs(argv.slice(idx + 2)),
  };
}
