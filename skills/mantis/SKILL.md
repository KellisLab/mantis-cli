---
name: mantis
description: Work with MIT Mantis spaces, maps, clusters, and notebooks via the mantis CLI. Use whenever the user mentions Mantis. Always run `mantis use get_space_context` first before any other Mantis action.
---

# Mantis

Mantis is a spatial data workspace: **spaces** contain **maps**, **clusters**, **bags**, and **notebooks**.

## First step

Run this **before any other Mantis command or tool** (skip only if you already ran it this turn):

```bash
mantis use get_space_context
```

If it fails with no thread configured, run `mantis setup` or `mantis select thread`, then retry.

## Setup

```bash
mantis setup          # API key + space + thread (only prompts what's missing)
mantis status
mantis select space
mantis select thread
```

Config lives at `~/.mantis/config.json`.

Install editor skills (CLI-only workflow, no MCP plugin):

```bash
mantis setup claude     # ~/.claude/skills/
mantis setup opencode   # ~/.config/opencode/skills/ + .opencode/skills/
mantis setup codex      # ~/.agents/skills/ (add --project for ./.agents/skills/)
```

## MCP tools via CLI

Every Mantis MCP tool is available through the CLI — no editor MCP plugin required:

```bash
mantis tools
mantis use get_space_context
mantis use search --query "your search"
mantis use inspect --uri "<mantis-uri>"
```

Use `--args '{"key":"value"}'` for complex arguments. Kebab flags map to snake_case (`--map-id` → `map_id`).

Use map IDs, field types, and URIs from the `get_space_context` output — do not guess them.

Common tools: `get_space_context`, `search`, `inspect`, `compare`, `union`/`intersect`/`diff`, the bag mutators (`create_bag`, `add_to_bag`, `filter_to_bag`, …), `set_plot_variables`, `legend_command`, `create_page`.

Not available via `mantis use`:
- `create_space`, `create_map_from_url`, `modify_map_from_url` — use `mantis setup` / `mantis create map` instead.
- `cite_file` — needs an agent sandbox the CLI can't provide; in-sandbox agents only.
- the notebook cell tools (`add_cell`, `execute_cell`, …) — not intended for agent use.

## Bulk export (local parquet)

`mantis use export` resolves a URI to its rows and writes a local parquet file under `~/.mantis/mantis_data/`. Use it when a question needs MANY rows (correlations, distributions, top-K, outliers) instead of paging `inspect`:

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
- After `mantis select space` or `mantis select thread`, the next `mantis use` picks up the new context automatically — no reload step.
