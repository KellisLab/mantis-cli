---
name: mantis
description: Work with MIT Mantis spaces, maps, clusters, and notebooks via the mantis CLI. Use whenever the user mentions Mantis. Always run `mantis use get_space_context` first before any other Mantis action.
---

# Mantis

Mantis is a spatial data workspace. It embeds records — rows of a dataset, documents, code files, anything with text — into a 2D semantic map where **proximity means similarity**. Related records land near each other, and Mantis groups them into labelled **clusters** so the shape of a dataset is visible at a glance.

The core entities:

- **Space** — a workspace. Contains one or more maps and the threads (saved states) over them.
- **Map** — a single embedded dataset: points (records) laid out in 2D, with typed **fields** (semantic / categoric / numeric / date) and a cluster hierarchy.
- **Cluster** — an auto-generated, labelled group of nearby points. Clusters nest (a cluster has child clusters and, at the leaves, points).
- **Bag** — a named, user-defined set of points you build by filtering or hand-picking. The unit of "save this subset to come back to."
- **Point** — one record on the map.
- **Thread (space state)** — a saved view/state of a space; the active one scopes what your commands operate on.

You explore a map by reading its clusters and field schema, narrow to the points you care about with search and filters, save them as bags, and pull rows out only when a question needs the underlying data.

## First step

Run this **before any other Mantis command or tool** (skip only if you already ran it this turn):

```bash
mantis use get_space_context
```

If it fails with no thread configured, run `mantis setup` or `mantis select`, then retry.

## Setup

```bash
mantis setup          # API key + space + thread (only prompts what's missing)
mantis status
mantis select         # switch the active space and/or thread
```

Config lives at `~/.mantis/config.json`.

Install editor skills (CLI-only workflow, no MCP plugin):

```bash
mantis setup claude       # ~/.claude/skills/
mantis setup opencode     # ~/.config/opencode/skills/ + .opencode/skills/
mantis setup codex        # ~/.agents/skills/ (add --project for ./.agents/skills/)
mantis setup cursor       # ~/.cursor/skills/
mantis setup windsurf     # ~/.codeium/windsurf/skills/
mantis setup copilot      # ~/.copilot/skills/
mantis setup antigravity  # ~/.agents/skills/ + ./.agents/skills/
```

## MCP tools via CLI

Every Mantis MCP tool is available through the CLI — no editor MCP plugin required:

```bash
mantis tools                                  # list every tool + its args
mantis use get_space_context                  # active space + maps (URIs + names)
mantis use inspect --uri "<mantis-uri>"
```

Mantis data lives on the server, not on disk — **all work on a map happens through `mantis use <tool>`.** Reach for a tool to inspect, search, and mutate Mantis entities; the data layer is the tools, addressed by `mantis://` URIs.

### Passing arguments

- Simple scalars can be flags: `--uri "..."`, `--kind cluster`, `--depth 1`. Kebab flags map to snake_case (`--map-id` → `map_id`).
- **Lists and objects MUST go through JSON** — the CLI only coerces flag values to string/number/bool, so `scope`, `uris`, `category_filters`, etc. cannot be passed as `--flag`. You can mix: JSON for the lists, plain flags for the scalars.

Pass the JSON inline with `--args`:

```bash
mantis use search --args '{"query":"System Performance","kind":"cluster","scope":["mantis://map/<id>"]}'
```

This works in every shell. The CLI is tolerant of shell mangling — it recovers PowerShell's quote-stripping (where `--args '{"k":"v"}'` arrives as `{k:v}`) and BOM/UTF‑16 artifacts automatically, so you do **not** need to escape quotes or pick a shell-specific form. Just write the JSON normally.

For very large or awkward payloads you can instead write the JSON to a file and pass `--args-file <path>` (BOMs and UTF‑16 are handled). Either way, never pass an empty `--args` — the CLI rejects an empty blob, because on a mutating tool like `filter_to_bag` "no filter" means *match everything* and would bag the whole map.

Use map IDs, field types, and URIs from `get_space_context` / tool output — never guess them.

### The URI substrate

Every Mantis entity has a stable `mantis://` URI you copy from one tool's output into the next tool's input:

```
mantis://space/<space_id>
mantis://map/<map_id>
mantis://map/<map_id>/cluster/<cluster_id>
mantis://map/<map_id>/bag/<bag_name>
mantis://map/<map_id>/point/<point_id>
mantis://map/<map_id>/dimensions          # the real, available field names
mantis://map/<map_id>/selection           # the user's current selection
```

### Tools come in tiers — read first, reason next, then mutate

**Tier 1 — orient (read):**
- `inspect --uri <uri> [--depth 1]` — universal read. On a map → top clusters + bags + stats; on a cluster → child clusters (and its points); on `.../dimensions` → the real field names. This answers "what's this map about?" without touching row data.

**Tier 2 — reason (read, no mutation):**
- `search` with `kind`: `point` (default — searches record text, honors `mode` = `hybrid`|`vector`|`lexical`), `cluster` (fuzzy-match a cluster by its label), `bag` (fuzzy-match a bag by name). **In a multi-map space, always pass `scope=["mantis://map/<id>"]`** or search returns `scope_required`.
- `compare --args '{"uris":[...],"on":"distribution","field":"<field>"}'` — per-URI stats on a field; single-URI is the canonical "summarize this set on this field" (e.g. "what departments are in this cluster?"). `on:"cluster_labels"` with 2+ map URIs → shared vs unique themes.
- `intersect` / `diff` / `union` — set algebra over point sets (`--args '{"uris":[...]}'`).
- `export` — bulk rows to local parquet (see Bulk export below).

**Tier 3 — act (mutate):**
- `create_bag` (`--from-uri <uri>` — cluster sources are recursive — or `--args '{"point_uris":[...]}'`), `add_to_bag`, `remove_from_bag`, `rename_bag`, `delete_bag`.
- `filter_to_bag` — structured filters → saved bag (see its own section below).
- `set_plot_variables`, `legend_command`, `create_page`.

**Field names are validated.** Any tool taking a `field`/`dimension`/`value` (`compare`, `filter_to_bag`, `legend_command`, `set_plot_variables`) returns `{error:"unknown_field", available_fields:[...]}` for a bad column. **Before filtering or comparing on a field, run `inspect --uri "mantis://map/<id>/dimensions"` to get the real field names and their values — do not invent them, and do not `export` just to discover what a column's values look like.**

### Resolve names → URIs the fast way

To act on "the X cluster" or "the Y bag", resolve the name with `search`, then drill in — **don't walk the tree** with repeated `inspect` calls:

```bash
# "Bag the Agent-Platform Integration cluster"
mantis use inspect --uri "mantis://map/<id>"                                                   # confirm the map
mantis use search --args '{"query":"Agent-Platform Integration","kind":"cluster","scope":["mantis://map/<id>"]}'   # → cluster_uri
mantis use create_bag --from-uri "<cluster_uri>" --name "Agent-Platform"
```

For making bags, see **Building bags** below — pick `filter_to_bag` vs `create_bag` first.

**Scale the tool to the question.** Descriptive questions ("what's this map about?", "what's in it?") are answered by `get_space_context` + one or two `inspect` calls — name, counts, field schema, cluster themes. Don't pull row-level data to describe *shape*. Reach for `export` only when the answer needs many actual rows (distributions, correlations, top-K, outliers).

### Building bags — `filter_to_bag` vs `create_bag`

To make a bag, first decide which tool fits — getting this wrong is the most common bag mistake:

- **All members share a field value** ("only markdown files", "score > 0.7", "from 2022") → **`filter_to_bag`** in one call. Do NOT export rows and collect point IDs by hand.
- **Arbitrary set with no common field** (a specific `.md` plus three particular `.js` files) → **`create_bag`** with `point_uris`, or `create_bag --from-uri <cluster_uri>` for a whole cluster.

`filter_to_bag` takes **exactly** these filter arrays (there is no `--filter` flag — passing `{"extension":"md"}` is wrong). All active filters are ANDed; `scope` is applied first. Field names are validated — a typo returns `available_fields`.

```jsonc
// category_filters — case-insensitive exact match on a categoric field
{"field": "<col>", "values": ["md", "mdx"]}
// numeric_filters — range; omit min or max for an open bound
{"field": "<col>", "min": 10, "max": 50}
// date_filters — ISO-8601; "after"/"before", either or both
{"field": "<col>", "after": "2022-01-01", "before": "2023-12-31"}
```

```bash
# "bag only the markdown files"  (one shared field value → filter_to_bag)
mantis use inspect --uri "mantis://map/<id>/dimensions"     # confirm field `extension` and that "md" is a value
mantis use filter_to_bag --args '{"scope":"mantis://map/<id>","category_filters":[{"field":"extension","values":["md"]}],"name":"Markdown Files"}'

# "bag this README plus its three helper scripts"  (arbitrary mix → create_bag)
mantis use create_bag --args '{"point_uris":["mantis://map/<id>/point/<p1>","mantis://map/<id>/point/<p2>"],"name":"README + helpers"}'
```

`scope` accepts a full map / cluster / bag / selection URI (cluster scope is recursive); bare names are rejected — pass the URI. Use `recency_days` / `recency_hours` as a shortcut for "last N days/hours".

### Anti-patterns (don't)

- Looking on disk for Mantis data — it lives on the server; use the tools.
- Guessing IDs or URIs — always copy them from a previous tool's output.
- Walking the cluster tree with `inspect` to find a cluster/bag by name — use `search --kind cluster|bag`.
- Inventing field names — `inspect .../dimensions` first.
- `export`-ing a whole map (then crunching pandas) just to learn a column's values or to see a few example rows — that's what `inspect .../dimensions` and `compare(distribution)` are for.
- `search` without `scope` in a multi-map space — it returns `scope_required`.
- Looping `inspect` over individual points to summarize a field — one `compare(..., on:"distribution", field:...)` does it.

Not available via `mantis use`:
- `create_space`, `create_map_from_url`, `modify_map_from_url` — use `mantis setup` / `mantis create map` instead.
- `cite_file` — needs an agent sandbox the CLI can't provide; in-sandbox agents only.
- the notebook cell tools (`add_cell`, `execute_cell`, …) — not intended for agent use.

## Bulk export (local parquet)

`mantis use export` resolves a URI to its rows and writes a local parquet file under `~/.mantis/mantis_data/`. It pulls the **entire** point set (no row limit — capped only at 200,000), so use it only when a question genuinely needs MANY rows: correlations, distributions, top-K, outliers. For "what is this map" / "what's in it", prefer `inspect` — do **not** export just to see example rows. Narrow the URI to a cluster when you can.

```bash
mantis use export --uri "mantis://map/<id>"                                  # all rows
mantis use export --uri "mantis://map/<id>/cluster/<cid>" --fields title,rating
mantis use export --uri "mantis://map/<id>" --include-embedding              # + _embedding (1536-d), _embedding_2d
```

Prints `{path, rows, fields, size_bytes}`. Then read it locally:

```bash
python3 -c "import pandas as pd; df = pd.read_parquet('<path>'); print(df.head())"
```

Always-present columns: `_point_id`, `_cluster_id`, `_cluster_label` (so you can `df.groupby('_cluster_label')`). Capped at 200,000 rows — narrow the URI if you hit `too_many_rows`.

## REST via CLI (setup & resources)

| Task | Command |
|------|---------|
| Setup | `mantis setup` |
| Status | `mantis status` |
| List spaces | `mantis spaces list --filter "query"` |
| Create map from CSV | `mantis create map file.csv` |
| Index codebase | `mantis create codebase . --create-map` |

API keys: https://mantis.csail.mit.edu/developer/#keys

## Conventions

- Refer to spaces and maps by **name** in user-facing text; use UUIDs in tool arguments.
- After `mantis select` (or `mantis spaces set` / `mantis threads set`), the next `mantis use` picks up the new context automatically — no reload step.
