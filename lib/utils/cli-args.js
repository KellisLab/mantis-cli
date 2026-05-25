export function parseListArgs(argv, { defaultLimit = 4 } = {}) {
  let filter = '';
  let offset = 0;
  let limit = defaultLimit;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--offset') {
      offset = parseInt(argv[++i], 10) || 0;
      continue;
    }
    if (a === '--limit') {
      limit = parseInt(argv[++i], 10) || defaultLimit;
      continue;
    }
    if (a === '--filter') {
      filter = argv[++i] ?? '';
      continue;
    }
    filter = argv.slice(i).join(' ').trim();
    break;
  }
  return { filter, offset, limit };
}

export function boolOption(value, fallback = false) {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'public'].includes(String(value).toLowerCase());
}
