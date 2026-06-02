---
description: Switch active Mantis space and thread via the CLI. Run `mantis use get_space_context` first when Mantis is mentioned.
---

# Select space and thread

First: `mantis use get_space_context` (unless you just ran it this turn).

**Agents: set by UUID, don't call the picker.** `mantis select` (and `mantis select space`/`thread`) opens an interactive picker that blocks on keyboard input — it hangs in a non-interactive shell. When you already know, or can resolve, the target, use the `set` commands instead:

```bash
mantis spaces list --filter "name"      # find the space UUID
mantis spaces set <uuid> "<name>"        # activate the space
mantis threads list --filter "name"      # find the thread UUID (after the space is set)
mantis threads set <uuid> "<name>"        # activate the thread
```

`mantis select` takes only `space`/`thread` as an argument — it does **not** accept a UUID or `--space-id`. Never hand-edit `~/.mantis/config.json`; the `set` commands keep space/thread consistent for you.

Interactive picker (a human at a terminal only):

```bash
mantis select          # both space and thread
mantis select space
mantis select thread
```

After switching, run `mantis use get_space_context` again.
