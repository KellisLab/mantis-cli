---
description: Select the active Mantis thread (space state) using the CLI. Run `mantis use get_space_context` first when Mantis is mentioned.
argument-hint: [filter]
allowed-tools: Bash, AskUserQuestion
---

# Select Mantis thread

First: `mantis use get_space_context` (unless you just ran it this turn).

Interactive:

```bash
mantis select thread
```

Scriptable:

```bash
mantis threads list --filter "$ARGUMENTS"
mantis threads new "Thread name"
mantis threads set <uuid> "<name>"
```

Then refresh context:

```bash
mantis use get_space_context
```

Context is read from `~/.mantis/config.json` on each invocation — no reload step.
