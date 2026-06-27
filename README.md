<h1 align="center">Mantis CLI 🗺️</h1>

<p align="center">
  <b>Spaces, maps, and MCP tools for AI coding agents — straight from your terminal.</b>
</p>

<p align="center">
  <a href="https://mantis.csail.mit.edu/docs/mantis-cli/">Docs</a> ·
  <a href="https://www.npmjs.com/package/mantisai-cli">npm</a> ·
  <a href="https://mantis.csail.mit.edu/developer/#keys">Get an API key</a> ·
  <a href="https://github.com/KellisLab/mantis-cli/issues">Issues</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mantisai-cli"><img src="https://img.shields.io/npm/v/mantisai-cli?style=for-the-badge&color=00B8D9&logo=npm&logoColor=white" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/mantisai-cli"><img src="https://img.shields.io/npm/dm/mantisai-cli?style=for-the-badge&color=8A2BE2&logo=npm&logoColor=white" alt="npm downloads"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-%E2%89%A518-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node ≥18"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-ready-FF6B35?style=for-the-badge" alt="MCP ready"></a>
  <a href="https://github.com/KellisLab/mantis-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://mantis.csail.mit.edu"><img src="https://img.shields.io/badge/Built%20at-MIT%20CSAIL-A31F34?style=for-the-badge" alt="Built at MIT CSAIL"></a>
</p>

---

**Mantis is a spatial data workspace** — it embeds records (dataset rows, documents, code files, anything with text) into a 2D semantic map where **proximity means similarity**, then auto-groups them into labelled clusters so the shape of a dataset is visible at a glance.

This CLI puts the whole workspace in your terminal. Every Mantis MCP tool is reachable through `mantis use <tool>` — **no editor plugin required** — so AI coding agents (Claude Code, OpenCode, Codex, Cursor, and more) can inspect, search, and reshape spatial data directly.

<table>
<tr><td><b>🧰 Full MCP surface</b></td><td>Every Mantis tool via <code>mantis use &lt;tool&gt;</code> — inspect, search, compare, set algebra, bags, pages, export. JSON in, JSON out. No MCP plugin needed.</td></tr>
<tr><td><b>🤖 Agent skill sync</b></td><td>One command installs editor skills for Claude Code, OpenCode, Codex, Cursor, Windsurf, Copilot, and Antigravity.</td></tr>
<tr><td><b>🔗 URI substrate</b></td><td>Every entity has a stable <code>mantis://</code> URI you pipe from one tool into the next — spaces, maps, clusters, bags, points, dimensions.</td></tr>
<tr><td><b>📦 Build maps locally</b></td><td>Turn a CSV/XLSX into a Mantis map, or index an entire codebase into a searchable semantic map in one call.</td></tr>
<tr><td><b>⚡ Fast cold start</b></td><td>Ships as a single bundled artifact — ~2.5× faster startup than an unbundled install. Bundled with Bun, runs on plain Node.</td></tr>
<tr><td><b>🔍 Scriptable</b></td><td>Spaces, threads, and tools all emit JSON — drop it straight into <code>jq</code>, pipelines, or agent loops.</td></tr>
</table>

---

## Quick Start

```bash
npm install -g mantisai-cli      # Node ≥18 — no Bun needed
mantis setup                     # API key + space + thread
mantis setup claude              # optional: install Claude Code skills
mantis use get_space_context     # confirm you're connected
```

Config lives at `~/.mantis/config.json`. Grab a developer key at **[mantis.csail.mit.edu/developer](https://mantis.csail.mit.edu/developer/#keys)**.

> **Naming:** repo [`KellisLab/mantis-cli`](https://github.com/KellisLab/mantis-cli) · npm package **`mantisai-cli`** · binary **`mantis`**.

## Commands

| Command | Description |
| --- | --- |
| `mantis setup [editor]` | API + space/thread, or sync skills for `claude`/`opencode`/`codex`/`cursor`/`windsurf`/`copilot`/`antigravity` |
| `mantis status` | Show current space, thread, and config |
| `mantis select [space\|thread\|both]` | Switch the active space and/or thread |
| `mantis spaces list\|resolve\|set` | Scriptable space ops (JSON) |
| `mantis threads list\|new\|set` | Scriptable thread ops (JSON) |
| `mantis tools` | List every MCP tool and its arguments |
| `mantis use <tool>` | Call any MCP tool — JSON output |
| `mantis create map <file>` | Build a map from a local CSV/XLSX |
| `mantis create codebase [root]` | Index a repo into CSV; add `--create-map` to embed it |

## The `mantis use` toolbox

Reach for these through `mantis use <tool>` (run `mantis tools` for full argument schemas):

| Tier | Tools |
| --- | --- |
| **Orient** | `get_space_context`, `inspect` |
| **Reason** | `search`, `compare`, `intersect`, `diff`, `union`, `export` |
| **Act** | `create_bag`, `add_to_bag`, `remove_from_bag`, `rename_bag`, `delete_bag`, `filter_to_bag`, `set_plot_variables`, `legend_command`, `create_page` |

```bash
# Orient: what's in this space?
mantis use get_space_context

# Reason: semantically search a map
mantis use search --args '{"query":"memory systems","kind":"point","scope":["mantis://map/<id>"]}'

# Act: save a cluster as a reusable bag
mantis use create_bag --from-uri "mantis://map/<id>/cluster/<cid>" --name "My Bag"
```

## Documentation

- [Overview](https://mantis.csail.mit.edu/docs/mantis-cli/)
- [Install](https://mantis.csail.mit.edu/docs/mantis-cli/install)
- [Claude Code](https://mantis.csail.mit.edu/docs/mantis-cli/claude-code) · [OpenCode](https://mantis.csail.mit.edu/docs/mantis-cli/opencode) · [Codex](https://mantis.csail.mit.edu/docs/mantis-cli/codex)

## Requirements

- **Node.js 18+** (the only runtime dependency — Bun is used to build, never to run)
- A Mantis **API + Developer key** → [mantis.csail.mit.edu/developer](https://mantis.csail.mit.edu/developer/#keys)

## Contributing

```bash
git clone https://github.com/KellisLab/mantis-cli.git
cd mantis-cli
bun install          # or: npm install
bun run build        # bundles bin/mantis.js -> dist/mantis.js
node dist/mantis.js --version
```

Publishing is automated: push a `v*` tag and the [GitHub Actions workflow](.github/workflows/publish-npm.yml) builds the bundle and publishes to npm.

---

<p align="center">
  <sub>Built at <a href="https://mantis.csail.mit.edu">MIT CSAIL</a> · <a href="https://github.com/KellisLab/mantis-cli/blob/main/LICENSE">MIT License</a></sub>
</p>
