export const FIELD_KEYS = [
  'title',
  'semantic',
  'numeric',
  'categoric',
  'date',
  'links',
  'custom_model',
  'connection',
  'delete',
];

function splitColumns(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitColumns);
  return String(value).split(',').map((v) => v.trim()).filter(Boolean);
}

export function columnSet(value) {
  return new Set(splitColumns(value));
}

export function inferFieldTypes(headers, opts = {}) {
  const title = columnSet(opts.titleColumn || opts.titleColumns);
  const semantic = columnSet(opts.semanticColumn || opts.semanticColumns);
  const numeric = columnSet(opts.numericColumn || opts.numericColumns);
  const categoric = columnSet(opts.categoricColumn || opts.categoricColumns);
  const date = columnSet(opts.dateColumn || opts.dateColumns);
  const links = columnSet(opts.linksColumn || opts.linksColumns);
  const deleted = columnSet(opts.deleteColumn || opts.deleteColumns);

  if (!title.size) {
    const candidate = headers.find((h) => ['title', 'name', 'path', 'file'].includes(h.toLowerCase()));
    if (candidate) title.add(candidate);
  }
  if (!semantic.size) {
    const candidates = headers.filter((h) =>
      ['content', 'summary', 'description', 'text', 'body'].includes(h.toLowerCase()),
    );
    for (const h of candidates.length ? candidates : headers.filter((h) => !title.has(h))) semantic.add(h);
  }

  return headers.map((h) => ({
    title: title.has(h),
    semantic: semantic.has(h),
    numeric: numeric.has(h),
    categoric: categoric.has(h),
    date: date.has(h),
    links: links.has(h),
    custom_model: false,
    connection: false,
    delete: deleted.has(h),
  }));
}

export function fieldSummary(headers, dataTypes) {
  return headers.map((h, i) => {
    const types = FIELD_KEYS.filter((k) => dataTypes[i]?.[k]);
    return `${h}: ${types.length ? types.join(', ') : 'unused'}`;
  });
}
