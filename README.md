# mantis-claude-code

Claude Code plugin for [Mantis](https://mantis.csail.mit.edu) — connect your terminal agent to Mantis MCP, pick a space and thread, and work with maps, clusters, and notebooks in context.

## Requirements

- [Claude Code](https://code.claude.com) (`claude` on your PATH)
- [Node.js](https://nodejs.org/) 18+
- A running Mantis API (default `https://kellis-h200-1.csail.mit.edu`; local dev: `http://localhost:8000`)
- A Mantis **Developer API key** (`live_…`) from https://mantis.csail.mit.edu/developer

## Install

```bash
npm install -g mantis-claude-code
mantis-setup
```

`mantis-setup` walks through API URL, API key, space, and thread selection, and registers the **mantis@mantis-plugins** Claude Code plugin.

## Claude Code

1. Open Claude Code (restart if it was already running).
2. `/plugin` → enable **mantis @ mantis-plugins** (user scope) if needed.
3. `/reload-plugins`
4. Confirm with `/mantis:status`

### Slash commands

| Command | Description |
|---------|-------------|
| `/mantis:connect` | Run setup / reconnect |
| `/mantis:space` | Change space (search or paste a `/space/{uuid}` link) |
| `/mantis:thread` | Change thread (space state) |
| `/mantis:status` | Show current space, thread, and MCP URL |
| `/mantis:select` | Quick space/thread selection |

After changing **thread**, run `/reload-plugins` so MCP picks up the new `X-Space-State-ID` header.

### Paste a space link

In `mantis-setup` or `/mantis:space`, paste a URL such as:

`https://mantis.csail.mit.edu/space/1e1ed055-c869-4b78-b41f-4216a44049d4/`

Use the same Mantis API base URL as the space you are targeting (local vs production).

## Update

**Plugin (slash commands, MCP, skills)** — in Claude Code:

```text
/plugin marketplace update mantis-plugins
```

Then update **mantis@mantis-plugins** and `/reload-plugins`.

**CLI** (`mantis-setup`, terminal pickers):

```bash
npm install -g mantis-claude-code@latest
```

## Manual plugin install

```bash
claude plugin marketplace add KellisLab/mantis-claude-code
claude plugin install mantis@mantis-plugins --scope user
```

Enable in `/plugin`, then `/reload-plugins`.

## npm

https://www.npmjs.com/package/mantis-claude-code

## License

MIT — see [LICENSE](LICENSE).
