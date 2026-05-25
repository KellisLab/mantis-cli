---
description: Run mantis setup to connect API key, space, and thread. Use when the user wants to connect to Mantis or fix auth issues. After setup, run `mantis use get_space_context`.
---

# Connect to Mantis

If already configured, run `mantis use get_space_context` first. Otherwise:

```bash
mantis setup
```

Setup only prompts for space/thread if they are not already configured.

Then verify:

```bash
mantis status
mantis use get_space_context
```

First-time Claude Code users: `mantis setup claude` installs skills to `~/.claude/skills/`.

API keys: https://mantis.csail.mit.edu/developer/#keys

If `mantis use` fails with "No thread configured", run `mantis select thread`.
