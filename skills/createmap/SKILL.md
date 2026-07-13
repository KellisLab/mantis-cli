---
description: Create a Mantis map from a local CSV or XLSX file using the mantis CLI. Run `mantis use get_space_context` first when Mantis is mentioned.
argument-hint: [csv-or-xlsx-path]
allowed-tools: Bash, AskUserQuestion
disable-model-invocation: true
---

# Create Mantis Map

First: `mantis use get_space_context` (unless you just ran it this turn).

Use the local `mantis create map` CLI. Prefer passing arguments explicitly so this works for agents and humans.

## Steps

1. Get the local CSV/XLSX path from `$ARGUMENTS` or ask the user for it.

2. Inspect the header row if it is a CSV. Decide field types (each has a matching `--<type>-column` flag, comma-separated):
   - `title`: one human-readable identifier column, usually `title`, `name`, `path`, or `file`.
   - `semantic`: text columns to embed, usually `content`, `summary`, `description`, `text`, or `body`.
   - `categoric`: labels like `language`, `kind`, `extension`, `category`.
   - `numeric`: measurements like `loc`, `bytes`, `score`, `count`.
   - `date`: date/time columns.
   - `links`: URL columns.
   - `image`: image URL/path columns.
   - `geospatial`: geographic columns (e.g. a lat/lon pair).
   - `coordinate1` / `coordinate2`: precomputed x / y layout coordinates to place points directly.
   - `vector`: precomputed embedding-vector columns.
   - `custom-model`: columns embedded with a custom model.
   - `connection`: columns linking points to each other.
   - ignored columns go in `--delete-column`.

   The `--*-column` flags cover all of the backend's supported types. For anything unusual, `--data-types <json>` passes a raw `data_types` array straight through.

3. Ask where to put the map if the user did not specify:
   - new space
   - existing space

4. Run `mantis create map` with explicit flags. Example:

```bash
mantis create map "./dataset.csv" \
  --space-mode new \
  --space-name "Codebase Index" \
  --private \
  --map-name "Source Files" \
  --title-column "path" \
  --semantic-column "summary,content" \
  --categoric-column "language,kind,extension" \
  --numeric-column "loc,bytes" \
  --activate \
  --thread-name "Dataset Exploration"
```

For an existing space:

```bash
mantis create map "./dataset.csv" \
  --space-mode existing \
  --space-id "<space-uuid>" \
  --map-name "Source Files" \
  --title-column "path" \
  --semantic-column "summary,content"
```

5. Report the created space link and map id from the JSON output.

## Notes

- If the user wants a fully interactive human flow, run only `mantis create map "./dataset.csv"`.
- If an agent is driving the flow, avoid interactive prompts by passing flags.
- Use `mantis setup` first if the CLI says API key or URL is missing.
