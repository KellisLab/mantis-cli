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
2. List accessible spaces — owned, shared, and public (most recent first).
3. Pick or create a **space state** (thread).
4. Save config for MCP headers (`X-Space-State-ID`).

After setup, switch context with **`/mantis:space`** and **`/mantis:thread`** (Claude Code **AskUserQuestion** menu with arrow keys). Terminal: `mantis-pick-space` / `mantis-pick-thread`.

If they have not run **`mantis-setup`** yet, tell them:

```bash
npm install -g mantis-claude-code
mantis-setup
```

That installs the **mantis@mantis-plugins** Claude Code plugin and saves API/space/thread config.

Then: **`/reload-plugins`** in Claude Code (if already open). Confirm **API URL** when prompted (`http://localhost:8000` for local).

If `/plugin` shows *unsupported source type*: remove **mantis@mantis-plugins**, run `mantis-setup` again (needs marketplace with `npm` plugin source, not `"."`), or start Claude with `--plugin-dir` pointing at the global npm package folder.

For connection errors: URL must end with `/mcp_integrated/`; avoid `/mcp/mcp` unless their deployment uses it.
