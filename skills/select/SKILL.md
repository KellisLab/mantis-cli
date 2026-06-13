---
description: Switch the active Mantis space and/or thread (space state) via the CLI — list, resolve, create, and set by UUID. Run `mantis use get_space_context` first when Mantis is mentioned.
argument-hint: [filter]
allowed-tools: Bash, AskUserQuestion
---

# Select Mantis space and thread

First: `mantis use get_space_context` (unless you just ran it this turn).

**Agents: set by UUID, don't call the picker.** `mantis select` (and `mantis select space`/`thread`) opens an interactive picker that blocks on keyboard input — it hangs in a non-interactive shell. When you already know, or can resolve, the target, use the `set` commands instead. `mantis select` takes only `space`/`thread` as an argument — it does **not** accept a UUID or `--space-id`. Never hand-edit `~/.mantis/config.json`; the `set` commands keep space and thread consistent for you.

## Switch the space

Find the UUID, then set it:

```bash
mantis spaces list --filter "$ARGUMENTS"     # browse / show options
mantis spaces resolve "$ARGUMENTS"           # resolve a name to one UUID
mantis spaces set <uuid> "<name>"            # <-- activate the space
```

`mantis spaces set` is the non-interactive way to change the active space. Pass the UUID and the display name. It also clears the now-stale thread for you, so switch the thread next.

## Switch the thread (space state)

After the space is set, pick a thread within it:

```bash
mantis threads list --filter "$ARGUMENTS"    # find the thread UUID
mantis threads new "Thread name"             # create a new thread
mantis threads set <uuid> "<name>"           # <-- activate the thread
```

## Interactive picker (humans at a terminal only)

These block waiting for keyboard input, so do **not** call them from an agent:

```bash
mantis select          # both space and thread
mantis select space
mantis select thread
```

## After switching

Run `mantis use get_space_context` again. Context is read from `~/.mantis/config.json` on each invocation — no reload step.
