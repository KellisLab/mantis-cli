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
```

## MCP tools via CLI

Every Mantis MCP tool is available through the CLI — no editor MCP plugin required:

```bash
mantis tools
mantis use get_space_context
mantis use get_cluster_children --map-id <uuid> --cluster-id <id>
mantis use general_search --query "your search"
```

Use `--args '{"key":"value"}'` for complex arguments. Kebab flags map to snake_case (`--map-id` → `map_id`).

Use map IDs, field types, and cluster names from the `get_space_context` output — do not guess them.

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
