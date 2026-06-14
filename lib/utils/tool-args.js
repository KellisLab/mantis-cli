import fs from 'node:fs';

/**
 * Read a text file as JSON source, tolerating the byte-order marks and UTF-16
 * encodings that Windows PowerShell's `Out-File`/`>` produce. PowerShell 5.1
 * defaults `Out-File -Encoding utf8` to UTF-8 *with* a BOM, and `>` to UTF-16LE
 * — both of which make a naive `readFileSync(path, 'utf8')` + `JSON.parse`
 * fail. Decode by BOM, fall back to UTF-8.
 */
function readArgsFile(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16BE: byte-swap into LE, then decode
    const swapped = Buffer.from(buf);
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const t = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = t;
    }
    return swapped.toString('utf16le');
  }
  return buf.toString('utf8');
}

/** Drop a leading UTF-8 BOM and surrounding whitespace. */
function clean(raw) {
  let s = raw;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s.trim();
}

function coerceScalar(tok) {
  if (tok === 'true') return true;
  if (tok === 'false') return false;
  if (tok === 'null') return null;
  if (tok !== '' && !Number.isNaN(Number(tok))) return Number(tok);
  return tok;
}

/**
 * Lenient JSON reader. Recovers the common shell-mangled forms — chiefly
 * PowerShell stripping the inner double-quotes from `--args '{"k":"v"}'`, which
 * arrives as `{k:v}`. Used ONLY as a fallback after strict JSON.parse fails, so
 * well-formed JSON is never affected. Handles unquoted keys and unquoted string
 * values (read up to the next structural `,`/`}`/`]`), so values that contain
 * `:` and `/` like `mantis://map/<id>` survive intact.
 */
function looseParse(input) {
  const s = input;
  let i = 0;
  const skipWs = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };

  function parseString(quote) {
    i++; // opening quote
    let out = '';
    while (i < s.length && s[i] !== quote) {
      if (s[i] === '\\') {
        out += s[i + 1];
        i += 2;
      } else {
        out += s[i++];
      }
    }
    i++; // closing quote
    return out;
  }

  // bare value: everything up to the next structural delimiter
  function parseBareValue() {
    const start = i;
    while (i < s.length && s[i] !== ',' && s[i] !== '}' && s[i] !== ']') i++;
    return coerceScalar(s.slice(start, i).trim());
  }

  // bare key: everything up to ':' or '}'
  function parseBareKey() {
    const start = i;
    while (i < s.length && s[i] !== ':' && s[i] !== '}') i++;
    return s.slice(start, i).trim();
  }

  function parseValue() {
    skipWs();
    const c = s[i];
    if (c === '{') return parseObject();
    if (c === '[') return parseArray();
    if (c === '"' || c === "'") return parseString(c);
    return parseBareValue();
  }

  function parseObject() {
    const obj = {};
    i++; // {
    skipWs();
    if (s[i] === '}') {
      i++;
      return obj;
    }
    while (i < s.length) {
      skipWs();
      const key = s[i] === '"' || s[i] === "'" ? parseString(s[i]) : parseBareKey();
      skipWs();
      if (s[i] === ':') i++;
      obj[key] = parseValue();
      skipWs();
      if (s[i] === ',') {
        i++;
        continue;
      }
      if (s[i] === '}') {
        i++;
        break;
      }
      break;
    }
    return obj;
  }

  function parseArray() {
    const arr = [];
    i++; // [
    skipWs();
    if (s[i] === ']') {
      i++;
      return arr;
    }
    while (i < s.length) {
      arr.push(parseValue());
      skipWs();
      if (s[i] === ',') {
        i++;
        continue;
      }
      if (s[i] === ']') {
        i++;
        break;
      }
      break;
    }
    return arr;
  }

  return parseValue();
}

/**
 * Guidance appended to every "your shell mangled the JSON" error. The data is
 * gone by the time argv reaches us — no parser can recover it — so the only
 * real fix is to keep the JSON out of the shell's argument splitter entirely.
 */
const SHELL_MANGLE_HELP =
  'Your shell stripped the quotes out of the JSON before mantis received it ' +
  '(common in PowerShell/cmd). The data cannot be recovered after the shell ' +
  'mangles it, so escaping harder will not help. Instead, keep the JSON out of ' +
  'the argument list: write it to a file and pass --args-file <path>, or pipe ' +
  'it in with --args-stdin (e.g. `echo \'{"uris":[...]}\' | mantis use <tool> --args-stdin`).';

/**
 * Decide whether a parsed arg object is the wreckage of shell quote-stripping
 * rather than what the caller meant. Two high-signal tells:
 *  1. The classic PowerShell collapse `{"\\":""}` — a key that is empty or made
 *     up only of backslashes/slashes/whitespace.
 *  2. The raw blob clearly carried a `mantis://` URI (every real payload does),
 *     but no surviving value still contains `://` — the shell ate the content.
 * Both are things a *correct* payload never produces, so flagging them is safe.
 */
function looksShellMangled(cleaned, parsed) {
  const keys = Object.keys(parsed);
  if (keys.some((k) => /^[\\/\s]*$/.test(k))) return true;
  if (cleaned.includes('://')) {
    const json = JSON.stringify(parsed);
    if (!json.includes('://')) return true;
  }
  return false;
}

/** Parse a JSON arg blob, recovering from BOMs and shell quote-stripping. */
function parseArgsBlob(raw, flag) {
  const cleaned = clean(raw);
  if (cleaned === '') {
    throw new Error(`${flag} was empty.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    try {
      parsed = looseParse(cleaned);
    } catch {
      throw new Error(
        `Could not parse ${flag} as JSON. Received: ${cleaned.slice(0, 80)}\n${SHELL_MANGLE_HELP}`,
      );
    }
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error(`${flag} must be a JSON object, got: ${cleaned.slice(0, 80)}\n${SHELL_MANGLE_HELP}`);
  }
  // a non-empty blob that parses to {} means recovery failed silently — refuse,
  // since an empty arg object on a mutating tool (e.g. filter_to_bag with no
  // filters) would match everything and quietly bag the whole map.
  if (!Array.isArray(parsed) && Object.keys(parsed).length === 0 && cleaned !== '{}') {
    throw new Error(`${flag} parsed to an empty object; the input looks malformed: ${cleaned.slice(0, 80)}\n${SHELL_MANGLE_HELP}`);
  }
  // structurally non-empty but its keys/values are mangling debris (e.g. the
  // PowerShell `{"\\":""}` collapse, or a payload whose mantis:// URIs were
  // eaten). Forwarding this produces a cryptic server-side validation error far
  // from the real cause, so stop here with an actionable message instead.
  if (!Array.isArray(parsed) && looksShellMangled(cleaned, parsed)) {
    throw new Error(`${flag} looks shell-mangled (received: ${cleaned.slice(0, 80)}).\n${SHELL_MANGLE_HELP}`);
  }
  return parsed;
}

export function parseToolArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // --args-stdin takes no value: the JSON is piped in, so the shell never
    // parses it and cannot strip its quotes. The bulletproof cross-shell path.
    if (a === '--args-stdin') {
      const raw = fs.readFileSync(0, 'utf8'); // fd 0 = stdin
      Object.assign(args, parseArgsBlob(raw, a));
      continue;
    }
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
      const raw = a === '--args-file' ? readArgsFile(val) : val;
      Object.assign(args, parseArgsBlob(raw, a));
      continue;
    }
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-/g, '_');
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[key] = coerceScalar(next);
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
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
