---
description: Change the active Mantis space or thread (space state) for MCP. Use when the user wants to switch workspace or conversation context.
disable-model-invocation: true
---

# Select Mantis space / thread

Prefer the interactive slash commands (arrow keys + filter as you type):

- **`/mantis:space`** — pick a space
- **`/mantis:thread`** — pick a thread (after space)

Legacy CLI: `mantis-select` or `node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-select.js"`.

After a change, run **`/reload-plugins`**.

Optional argument from user (not passed to CLI automatically): if they give a **thread UUID**, they can paste it during setup or edit `~/.mantis/claude-code/config.json` (or `${CLAUDE_PLUGIN_DATA}/config.json`) and set `spaceStateId`.
