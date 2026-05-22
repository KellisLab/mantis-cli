---
description: Select your Mantis space (arrow-key menu in Claude Code). Use when switching workspace for MCP.
argument-hint: [filter]
allowed-tools: AskUserQuestion, Bash
disable-model-invocation: true
---

# Select Mantis space

Slash-command `!` blocks cannot use an interactive terminal (no arrow keys). Use **AskUserQuestion** — that is the native Claude Code picker UI.

## Steps

1. If `$ARGUMENTS` looks like a Mantis space URL (`/space/{uuid}`) or a UUID, resolve it first:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-resolve-space.js" $ARGUMENTS
```

If JSON has `space`, run `mantis-set-space.js` with that id and name, then stop (skip browse). On `error`, explain and offer browse.

2. Otherwise run (search text or empty for recent page):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-list-spaces.js" --filter "$ARGUMENTS"
```

Parse the JSON. On `error`, tell the user to run `mantis-setup` in a terminal.

3. **AskUserQuestion** (max 4 options per call):
   - If the user pasted a link in chat, pass it as `$ARGUMENTS` or run step 1 with that URL.
   - `header`: `Space`
   - `question`: `Which Mantis space should Claude use?`
   - For each item in `spaces`, one option:
     - `label`: space `name` (short)
     - `description`: full `id` + map count if present
   - If `hasMore` is true, use the 3rd slot for the best match and the 4th option:
     - `label`: `More spaces…`
     - `description`: `Show next page (${total} total)`
   - On "More spaces…", re-run with `--offset` increased by `limit` (same filter), then AskUserQuestion again.

4. After the user picks a space (not "More"), run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/mantis-set-space.js" <uuid-from-description> "<name>"
```

Use the UUID from the selected option's **description**, not the label.

5. If `needThread` or `threadCleared`, run **`/mantis:thread`** next in this session (user must pick a thread for the new space).

6. After space or thread changes, tell the user to run **`/reload-plugins`** so MCP reconnects with the updated `X-Space-State-ID` header. Do not try to invoke `/reload-plugins` as a Skill tool.

## Terminal fallback

If AskUserQuestion does not appear (known CC bug in some versions), tell the user to run in a separate terminal:

```bash
mantis-pick-space
```

Then `/reload-plugins`.
