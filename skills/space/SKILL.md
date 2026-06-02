---
description: Select the active Mantis space using the CLI or list/search helpers. Run `mantis use get_space_context` first when Mantis is mentioned.
argument-hint: [filter]
allowed-tools: Bash, AskUserQuestion
---

# Select Mantis space

First: `mantis use get_space_context` (unless you just ran it this turn).

**If you (an agent) are switching the space, use these — not the interactive picker.** Find the UUID, then set it:

```bash
mantis spaces list --filter "$ARGUMENTS"     # browse / show options
mantis spaces resolve "$ARGUMENTS"           # resolve a name to one UUID
mantis spaces set <uuid> "<name>"            # <-- activate the space
```

`mantis spaces set` is the non-interactive way to change the active space. Pass the UUID and the display name. Never edit `~/.mantis/config.json` by hand to switch — `spaces set` also clears the now-stale thread for you.

Interactive picker (humans at a terminal only — it blocks waiting for keyboard input, so do **not** call it from an agent):

```bash
mantis select space
```

Note: `mantis select` takes only `space`/`thread` as its argument — it does **not** accept a UUID or `--space-id`. To select by UUID, use `mantis spaces set`.

After switching, the thread is usually cleared — run `mantis select thread` (or `mantis threads set <uuid> "<name>"`), then `mantis use get_space_context`.
