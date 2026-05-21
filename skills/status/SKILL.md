---
description: Show the current Mantis space, thread, and MCP URL from plugin config. Use when checking whether Claude Code is connected to Mantis.
disable-model-invocation: true
---

# Mantis status

Run in the terminal:

```bash
mantis-status
```

Or:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-status.js"
```

Report the output to the user. If no thread is set, tell them to run `/mantis:connect` or `mantis-setup`, then `/reload-plugins`.
