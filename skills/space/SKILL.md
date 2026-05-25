---
description: Select the active Mantis space using the CLI or list/search helpers. Run `mantis use get_space_context` first when Mantis is mentioned.
argument-hint: [filter]
allowed-tools: Bash, AskUserQuestion
---

# Select Mantis space

First: `mantis use get_space_context` (unless you just ran it this turn).

Interactive:

```bash
mantis select space
```

Scriptable (for agent menus):

```bash
mantis spaces list --filter "$ARGUMENTS"
mantis spaces resolve "$ARGUMENTS"
mantis spaces set <uuid> "<name>"
```

If space changed and thread was cleared, run `mantis select thread` next, then `mantis use get_space_context`.
