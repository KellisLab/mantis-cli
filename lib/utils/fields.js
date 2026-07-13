export const FIELD_KEYS = [
  'title',
  'semantic',
  'numeric',
  'categoric',
  'date',
  'links',
  'custom_model',
  'image',
  'geospatial',
  'coordinate1',
  'coordinate2',
  'connection',
  'vector',
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
  const customModel = columnSet(opts.customModelColumn || opts.customModelColumns);
  const image = columnSet(opts.imageColumn || opts.imageColumns);
  const geospatial = columnSet(opts.geospatialColumn || opts.geospatialColumns);
  const coordinate1 = columnSet(opts.coordinate1Column || opts.coordinate1Columns);
  const coordinate2 = columnSet(opts.coordinate2Column || opts.coordinate2Columns);
  const connection = columnSet(opts.connectionColumn || opts.connectionColumns);
  const vector = columnSet(opts.vectorColumn || opts.vectorColumns);
  const deleted = columnSet(opts.deleteColumn || opts.deleteColumns);

  if (!title.size) {
    const candidate = headers.find((h) => ['title', 'name', 'path', 'file'].includes(h.toLowerCase()));
    if (candidate) title.add(candidate);
  }
  if (!semantic.size) {
    // Don't sweep an explicitly-typed column into the semantic fallback — a
    // column the user tagged as image/vector/geospatial/etc. shouldn't also be
    // embedded as text.
    const claimed = (h) =>
      title.has(h) || numeric.has(h) || categoric.has(h) || date.has(h)
      || links.has(h) || customModel.has(h) || image.has(h) || geospatial.has(h)
      || coordinate1.has(h) || coordinate2.has(h) || connection.has(h)
      || vector.has(h) || deleted.has(h);
    const candidates = headers.filter((h) =>
      ['content', 'summary', 'description', 'text', 'body'].includes(h.toLowerCase()),
    );
    for (const h of candidates.length ? candidates : headers.filter((h) => !claimed(h))) semantic.add(h);
  }

  return headers.map((h) => ({
    title: title.has(h),
    semantic: semantic.has(h),
    numeric: numeric.has(h),
    categoric: categoric.has(h),
    date: date.has(h),
    links: links.has(h),
    custom_model: customModel.has(h),
    image: image.has(h),
    geospatial: geospatial.has(h),
    coordinate1: coordinate1.has(h),
    coordinate2: coordinate2.has(h),
    connection: connection.has(h),
    vector: vector.has(h),
    delete: deleted.has(h),
  }));
}

export function fieldSummary(headers, dataTypes) {
  return headers.map((h, i) => {
    const types = FIELD_KEYS.filter((k) => dataTypes[i]?.[k]);
    return `${h}: ${types.length ? types.join(', ') : 'unused'}`;
  });
}
