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

4. After a successful `mantis-set-thread.js`, tell the user to run **`/reload-plugins`**. Claude Code exposes `/reload-plugins` as a user command, not a Skill tool, so do not try to invoke it yourself.

5. Confirm with one line: space name, thread name, and that MCP is ready after `/reload-plugins`.

## Terminal fallback

```bash
mantis-pick-thread
```
