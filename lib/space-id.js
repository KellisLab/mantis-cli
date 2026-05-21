const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Extract space UUID from a Mantis URL (/space/{id}), raw UUID, or search text containing one. */
export function parseSpaceIdFromInput(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const pathMatch = t.match(/\/space\/([0-9a-f-]{36})/i);
  if (pathMatch) return pathMatch[1].toLowerCase();
  const uuidMatch = t.match(UUID_RE);
  if (uuidMatch) return uuidMatch[0].toLowerCase();
  return null;
}
