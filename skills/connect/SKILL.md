---
description: Run the Mantis MCP setup wizard (API key, space, thread). Use when the user wants to connect Claude Code to Mantis or fix MCP connection issues.
disable-model-invocation: true
---

# Connect Mantis MCP

Run the interactive setup in the user's terminal:

```bash
mantis-setup
```

If the plugin is not on PATH, use:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-setup.js"
```

The wizard will:

1. Ask for Mantis API URL and Developer API key (`live_…` from the Mantis Developer portal).
2. List owned spaces (most recent first).
3. Pick or create a **space state** (thread).
4. Save config for MCP headers (`X-Space-State-ID`).

After setup, switch context with **`/mantis:space`** and **`/mantis:thread`** (Claude Code **AskUserQuestion** menu with arrow keys). Terminal: `mantis-pick-space` / `mantis-pick-thread`.

Then tell the user to:

1. Enable the **mantis** plugin if needed (`/plugin`).
2. Confirm **API URL** matches their instance when the plugin prompts.
3. Run **`/reload-plugins`** so MCP picks up the thread header.

For connection errors: URL must end with `/mcp_integrated/`; avoid `/mcp/mcp` unless their deployment uses it.
