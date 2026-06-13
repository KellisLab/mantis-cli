# mantisai-cli

Mantis developer CLI — spaces, maps, MCP tools for AI agents, and editor skill sync.

> **Naming:** repo [`KellisLab/mantis-cli`](https://github.com/KellisLab/mantis-cli), npm package **`mantisai-cli`**, binary **`mantis`**.

Full docs (VitePress):

- [Overview](https://mantis.csail.mit.edu/docs/mantis-cli/)
- [Install](https://mantis.csail.mit.edu/docs/mantis-cli/install)
- [Claude Code](https://mantis.csail.mit.edu/docs/mantis-cli/claude-code)
- [OpenCode](https://mantis.csail.mit.edu/docs/mantis-cli/opencode)
- [Codex](https://mantis.csail.mit.edu/docs/mantis-cli/codex)

Source: `Mantis/docs/mantis-cli/`

## Requirements

- Node.js 18+
- Mantis API + Developer key from https://mantis.csail.mit.edu/developer/#keys

## Install

```bash
npm install -g mantisai-cli
mantis setup
mantis setup claude    # optional: Claude Code skills
mantis use get_space_context
```

Config: `~/.mantis/config.json`

## Commands

| Command | Description |
| --- | --- |
| `mantis setup [claude\|opencode\|codex\|cursor\|windsurf\|copilot\|antigravity]` | API + space/thread, or sync editor skills |
| `mantis status` | Current config |
| `mantis select [space\|thread\|both]` | Switch space/thread |
| `mantis spaces list\|resolve\|set` | Scriptable space ops (JSON) |
| `mantis threads list\|new\|set` | Scriptable thread ops (JSON) |
| `mantis tools` | List MCP tools |
| `mantis use <tool>` | Call an MCP tool (JSON output) |
| `mantis create map <file>` | Map from CSV/XLSX |
| `mantis create codebase [root]` | Index repo; optional `--create-map` |

## npm

https://www.npmjs.com/package/mantisai-cli

## License

MIT — see [LICENSE](LICENSE).
