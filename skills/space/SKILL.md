---
description: Select your Mantis space (arrow-key menu in Claude Code). Use when switching workspace for MCP.
argument-hint: [filter]
allowed-tools: AskUserQuestion, Bash
disable-model-invocation: true
---

# Select Mantis space

Slash-command `!` blocks cannot use an interactive terminal (no arrow keys). Use **AskUserQuestion** — that is the native Claude Code picker UI.

## Steps

1. Run (substitute filter from `$ARGUMENTS` if present):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-list-spaces.js" $ARGUMENTS
```

Parse the JSON. On `error`, tell the user to run `mantis-setup` in a terminal.

2. **AskUserQuestion** (max 4 options per call):
   - `header`: `Space`
   - `question`: `Which Mantis space should Claude use?`
   - For each item in `spaces`, one option:
     - `label`: space `name` (short)
     - `description`: full `id` + map count if present
   - If `hasMore` is true, use the 3rd slot for the best match and the 4th option:
     - `label`: `More spaces…`
     - `description`: `Show next page (${total} total)`
   - On "More spaces…", re-run with `--offset` increased by `limit` (same filter), then AskUserQuestion again.

3. After the user picks a space (not "More"), run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-set-space.js" <uuid-from-description> "<name>"
```

Use the UUID from the selected option's **description**, not the label.

4. If `threadCleared`, run **`/mantis:thread`** next (same session).

5. **Do not ask the user** to run `/reload-plugins`. Only needed when changing **thread** (step 3 of `/mantis:thread` flow).

## Terminal fallback

If AskUserQuestion does not appear (known CC bug in some versions), tell the user to run in a separate terminal:

```bash
mantis-pick-space
```

Then `/reload-plugins`.
