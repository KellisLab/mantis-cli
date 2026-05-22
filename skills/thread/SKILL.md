---
description: Select your Mantis thread / space state (arrow-key menu in Claude Code). Use after /mantis:space.
argument-hint: [filter]
allowed-tools: AskUserQuestion, Bash
disable-model-invocation: true
---

# Select Mantis thread

Use **AskUserQuestion** for the arrow-key menu inside Claude Code (shell pickers have no TTY in slash commands).

## Steps

1. Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-list-threads.js" $ARGUMENTS
```

If error mentions space, tell user to run **`/mantis:space`** first.

2. **AskUserQuestion**:
   - `header`: `Thread`
   - `question`: `Which thread in this space?`
   - One option per thread (`label`: name, `description`: full `id`)
   - Always include (if room under 4 options):
     - `label`: `New thread`
     - `description`: `Create a new space state for Claude Code`
   - If `hasMore`, add `More threads…` like `/mantis:space` (paginate with `--offset`)

3. On selection:
   - **New thread** → `node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-set-thread.js" --new "Claude Code"`
   - Otherwise → `node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-set-thread.js" <uuid> "<name>"`

4. **Immediately after** a successful `mantis-set-thread.js`, you **must** run **`/reload-plugins`** yourself in this same turn (do not ask the user). MCP headers are fixed at connect time; changing space in `mantis-setup` also requires `/reload-plugins` after the thread is set.

5. Confirm with one line: space name, thread name, and that MCP was refreshed.

## Terminal fallback

```bash
mantis-pick-thread
```
