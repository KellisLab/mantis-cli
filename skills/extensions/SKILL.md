---
name: extensions
description: Build, modify, explain, validate, package, or install Mantis extensions and custom vertical panels. Use when a user asks for reusable Mantis UI, extension commands or events, a .mantisx package, or an optional Python-backed extension action.
---

# Mantis Extensions

Mantis extensions are trusted packages that add reusable workspace functionality without changing the core app. They can contain:

- sandboxed panel UIs, available under **Verticals > Extensions**
- an extension host for durable commands, subscriptions, activation, and state
- an optional Python backend for work that should not run in the browser

Panel code uses `window.mantis`; host code uses `mantis`. Both use the same asynchronous, permission-gated SDK. Panels are short-lived and run in `allow-scripts` iframes without same-origin access. The host runs in a Web Worker and survives panel closure until the extension deactivates.

## First step

Run this before any other Mantis command or tool, unless it already ran this turn:

```bash
mantis use get_space_context
```

Use the returned space id when installation needs a target. Never guess a space, map, field, or permission.

## Documentation routing

The docs are authoritative. Read the pages relevant to the requested contribution; do not invent manifest fields, SDK methods, permissions, package layouts, or lifecycle behavior.

| Need | Read |
|---|---|
| Architecture or choosing host vs panel | [Overview](https://mantis.csail.mit.edu/docs/features/extensions/overview.html) |
| Any new or changed package | [Manifest](https://mantis.csail.mit.edu/docs/features/extensions/manifest.html) |
| Panel layout and lifecycle | [Custom panels and verticals](https://mantis.csail.mit.edu/docs/features/extensions/custom-panels-and-verticals.html) and [Panel UI](https://mantis.csail.mit.edu/docs/features/extensions/panel-ui.html) |
| Mantis data, state, commands, or events | [SDK API](https://mantis.csail.mit.edu/docs/features/extensions/sdk-api.html) |
| Server-side execution | [Python backend](https://mantis.csail.mit.edu/docs/features/extensions/python-backend.html) |
| Producing or checking an archive | [Packaging and installation](https://mantis.csail.mit.edu/docs/features/extensions/packaging-and-installation.html) |
| A concrete SDK pattern | [Examples](https://mantis.csail.mit.edu/docs/features/extensions/examples.html) |
| Permissions, trust, or platform limits | [Security and limits](https://mantis.csail.mit.edu/docs/features/extensions/security-and-limits.html) |

For a normal panel extension, read the overview, manifest, relevant panel/SDK sections, packaging, and security guidance. Read backend documentation only when server-side execution is actually needed. Use examples as patterns, not as a substitute for the reference pages.

## Build workflow

1. Clarify the user-visible workflow, what Mantis data it reads or writes, whether behavior must survive panel closure, and the target space if installation is requested.
2. Inspect the existing extension project before choosing its build system or layout. Preserve established conventions.
3. Design the smallest useful contribution:
   - use panel-local code for UI and temporary view state
   - add a host `main` only for durable commands, subscriptions, activation, or state
   - add Python only when the browser SDK cannot do the required work
4. Declare the narrowest supported permission set. Explain every write, command, backend, or network capability.
5. Build self-contained browser output. Do not import from the parent Mantis app; bundle host and panel dependencies into the extension output.
6. Validate manifest paths and ids, contribution entries, activation events, permissions, backend actions, and referenced assets.
7. Run the project's tests/build when present, package it, then inspect the archive layout before reporting success.

## Manifest and SDK rules

- Every package needs `mantis.extension.json`.
- Keep extension, panel, and command ids stable. Use globally unique dotted ids for extensions and prefix command ids with the extension id.
- Declare only documented permissions: `maps:read`, `selection:read`, `selection:write`, `bags:write`, `panels:write`, `commands:execute`, and `backend:invoke`.
- Use `context.workspaceState` / `window.mantis.workspaceState` for state scoped to the current space and `globalState` for user-level extension state.
- Put durable command registrations and event subscriptions in host `activate(context)` and add returned disposables to `context.subscriptions`.
- Dispose panel-local subscriptions when the panel unloads.
- Do not use raw `rpc` unless debugging the bridge and the documented helper cannot serve the request.
- Do not use unsupported `contributes.menus` or `contributes.settings` fields.

## Python backend decision

Python backends are supported but optional. Add one only for server-side computation, Python-only dependencies, or work that cannot safely or practically run in the panel/host SDK.

When a backend is needed:

- request `backend:invoke`
- allowlist actions in `backend.actions`
- validate every payload and return JSON-serializable values
- pin and minimize requirements
- keep `network: false` unless external access is essential and explicitly disclosed
- never treat the backend context as secret storage

Do not describe the backend as deprecated unless the current docs say so.

## Security

- Treat extensions as trusted code even though panels are sandboxed and SDK calls are permission-gated.
- Never add same-origin access to a panel or reach into the parent DOM, cookies, or browser storage.
- Do not embed API keys or other secrets in browser or backend assets.
- Avoid sending Mantis data to external services; if required, make the data flow and backend network access explicit.
- Prefer explicit user actions for writes, clear progress for slow work, and visible errors for permission or backend failures.
- Review publisher/source, permissions, dependencies, backend actions, and network access before installation.

## Package and install

Prefer `.mantisx` or `.zip` for real extensions; use inline JSON only for small fixtures or debugging. The archive must contain `mantis.extension.json` at its root or inside one single top-level folder. Browser assets must not be under `backend/`; Python backend files must be under `backend/`. Paths must be safe, relative, and UTF-8 text.

Installing changes a Mantis space. Install only when the user asks for it or the task explicitly includes installation:

```bash
mantis use install_extension --file extension.mantisx --space-id <space-id>
```

The API-key user must own the target space. Installation is personal to that user within the space. Report the extension id/version, panels and commands, requested permissions, backend/network status, archive path, and installation result.
