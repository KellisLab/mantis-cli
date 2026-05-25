export function parseToolArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--args') {
      Object.assign(args, JSON.parse(argv[++i] || '{}'));
      continue;
    }
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-/g, '_');
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
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
    throw new Error('Usage: mantis use <tool> [--args JSON] [--key value ...]');
  }
  return {
    tool: argv[idx + 1],
    args: parseToolArgs(argv.slice(idx + 2)),
  };
}
