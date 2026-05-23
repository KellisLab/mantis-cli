# mantisai-cli

Mantis developer CLI — manage spaces, create maps from local data, and configure [Claude Code](https://code.claude.com) as a Mantis client. Distributed alongside the **mantis@mantis-plugins** Claude Code plugin.

> **Naming note:** the repo is `KellisLab/mantis-cli` but the npm package is published as **`mantisai-cli`** because `mantis-cli` was already taken on npm. The binary you run is just `mantis`.

## Requirements

- [Node.js](https://nodejs.org/) 18+
- A running Mantis API (default `https://kellis-h200-1.csail.mit.edu`; local dev: `http://localhost:8000`)
- A Mantis **Developer API key** (`live_…`) from https://mantis.csail.mit.edu/developer/#keys
- (Optional, for plugin features) [Claude Code](https://code.claude.com) (`claude` on your PATH)

## Install

```bash
npm install -g mantisai-cli
mantis setup
```

`mantis setup` walks through API URL, API key, space, and thread selection. If Claude Code is installed, it also registers the **mantis@mantis-plugins** plugin and writes the MCP config.

## Commands

| Command | Description |
|---------|-------------|
| `mantis setup` | Connect to Mantis, pick space & thread, configure Claude Code |
| `mantis status` | Show current API, space, thread, and MCP URL |
| `mantis select [space\|thread\|both]` | Switch active space and/or thread |
| `mantis create map <file>` | Create a Mantis map from a local CSV/XLSX |
| `mantis create codebase [root]` | Index a local codebase to CSV; optionally create a map |

Run any command with `--help` for full options.

### Examples

```bash
# Create a new private space and load a CSV as a map
mantis create map ./data.csv \
  --space-mode new --space-name "Sales" --private \
  --map-name "Q4 Pipeline" \
  --title-column name --semantic-column description --numeric-column revenue

# Add a map to an existing space
mantis create map ./more-data.csv \
  --space-mode existing --space-id <uuid> \
  --map-name "Cohort 2"

# Index your repo into Mantis
mantis create codebase . --create-map --space-mode new --space-name "Repo Index" --private
```

## Claude Code integration

After `mantis setup`:

1. Open Claude Code (restart if it was already running).
2. `/plugin` → enable **mantis @ mantis-plugins** (user scope) if needed.
3. `/reload-plugins`
4. Confirm with `/mantis:status`.

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

In `mantis setup` or `/mantis:space`, paste a URL such as:

`https://mantis.csail.mit.edu/space/1e1ed055-c869-4b78-b41f-4216a44049d4/`

Use the same Mantis API base URL as the space you are targeting (local vs production).

## Update

**CLI**:

```bash
npm install -g mantisai-cli@latest
```

**Plugin (slash commands, MCP, skills)** — in Claude Code:

```text
/plugin marketplace update mantis-plugins
```

Then update **mantis@mantis-plugins** and `/reload-plugins`.

## Manual plugin install

```bash
claude plugin marketplace add KellisLab/mantis-cli
claude plugin install mantis@mantis-plugins --scope user
```

Enable in `/plugin`, then `/reload-plugins`.

## Migrating from `mantis-claude-code`

If you previously installed the package as `mantis-claude-code`, migrate with:

```bash
npm uninstall -g mantis-claude-code
npm install -g mantisai-cli
mantis setup
```

Your local config at `~/.mantis/claude-code/config.json` is preserved.

## npm

https://www.npmjs.com/package/mantisai-cli

## License

MIT — see [LICENSE](LICENSE).
