---

## name: mantis
description: Work with MIT Mantis spaces, maps, clusters, and notebooks via MCP. Use when the user mentions Mantis, spaces, maps, embeddings, clusters, bags, or wants to explore/visualize data in their workspace.

# Mantis (Claude Code)

Mantis is a spatial data workspace: **spaces** contain **maps** (embeddings of datasets), **clusters**, **bags**, and **notebooks**.

## Connection

1. User runs `mantis-setup` (or `/mantis:connect`) with a Developer API key from the Mantis portal.
2. MCP endpoint: `{api_base_url}/mcp_integrated/` (trailing slash required).
3. Required header on every MCP request: `**X-Space-State-ID`** = thread UUID from setup (setup writes this into the plugin MCP config).
4. After changing space/thread: `mantis-select` then ask the user to run `**/reload-plugins**`.

## REST (setup only)


| Endpoint                                      | Purpose                             |
| --------------------------------------------- | ----------------------------------- |
| `GET /api/v1/me/spaces/?scope=accessible&limit=100` | List owned, shared, and public spaces |
| `GET /api/v1/me/space-states/?space_id=`      | List threads                        |
| `POST /api/v1/me/space-states/`               | Create thread `{ space_id, name? }` |


Auth: `Authorization: Bearer live_…` — key must be linked to a Mantis user.

## MCP tools (read-focused)

Call `**get_space_context**` first when you need map IDs, field types, cluster names, or point counts.

Other useful tools: `get_tree_status`, `get_cluster_children`, `get_bags_from_map`, `get_bag_contents`, `get_point_details`, `get_selected_points`, `get_available_dimensions`.

Space management tools (`create_space`, `create_map_from_url`, etc.) need session or space-state context.

## Conventions

- Refer to spaces and maps by **name** in user-facing text; use UUIDs only in tool arguments.
- Maps belong to a space; pick `primary_map_id` from space list API or `get_space_context`.
- Notebooks can bootstrap from `X-Space-State-ID` alone; file uploads still need a chat session when applicable.
- Default API URL: `https://kellis-h200-1.csail.mit.edu` (local: `http://localhost:8000`). API keys: https://mantis.csail.mit.edu/developer/#keys

## Slash commands in this plugin

- `/mantis:connect` — first-time setup (API key)
- `/mantis:space` — pick space via **AskUserQuestion** (↑↓ in Claude UI; optional filter: `/mantis:space atlas`)
- `/mantis:thread` — pick thread the same way
- Terminal pickers: `mantis-pick-space` / `mantis-pick-thread` if the in-chat menu fails
- `/mantis:status` — show current space/thread

After **`/mantis:thread`** only, run `/reload-plugins` once (MCP headers are fixed at connect time). Space-only changes do not need a reload until a thread is set.