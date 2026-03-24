# hubspot-page-builder

HubSpot Page Builder is a CLI-backed skill for Claude, OpenClaw, and skills.sh. It creates, updates, previews, and publishes HubSpot landing pages from raw HTML through the HubSpot CMS Pages API.

The local command does the deterministic work. The skill teaches an agent how to use that command safely in a draft-first workflow.

## What It Is

- A TypeScript core library for HubSpot landing page operations
- A local command: `hubspot-page-builder`
- A portable skill bundle in [skills/hubspot-page-builder](skills/hubspot-page-builder)

## Why This Shape

This project is intentionally not MCP-first.

- Claude and OpenClaw can both use skill folders
- skills.sh distributes skills, not runtimes
- a local command is easier to test and debug than embedding product logic into skill scripts

MCP can still be added later as an adapter over the same core library.

## Install

### 1. Get a HubSpot access credential

Use one of these:

- a **legacy private app access token** with the `content` scope
- a **service key** with the `content` scope

In both cases, the tool uses the value as a bearer token through `HUBSPOT_ACCESS_TOKEN`.

### 2. Install the command

```bash
npm install
npm run build
```

For local development, run:

```bash
npm run dev -- list-templates
```

### 3. Configure auth

Either export the access token or service key:

```bash
export HUBSPOT_ACCESS_TOKEN="pat-..."
```

You can also pin a portal-specific default landing page template:

```bash
export HUBSPOT_DEFAULT_TEMPLATE_PATH="@hubspot/elevate/templates/blank.hubl.html"
```

Or persist it in local config:

```bash
node dist/cli.js init --access-token pat-...
```

Config is stored at `~/.hubspot-page-builder/config.json`.

The stored config can include `defaultTemplatePath` when your portal has a known-good landing page template and you do not want to rely on the built-in fallback.

## Commands

Every command writes JSON to stdout and keeps diagnostics on stderr.

```bash
hubspot-page-builder get-account-info
hubspot-page-builder list-templates
hubspot-page-builder list-pages --status draft --limit 10
hubspot-page-builder get-page --page-id 123
hubspot-page-builder get-page --page-url "https://app-na2.hubspot.com/pages/245654093/editor/327615359711/content"
hubspot-page-builder create-page --input payload.json
hubspot-page-builder update-page --input payload.json
hubspot-page-builder publish-page --page-id 123
hubspot-page-builder preview-url --page-id 123
```

Mutating commands accept `--input -` for stdin JSON.

For existing pages, you can use either a numeric `pageId` or the full HubSpot editor URL. This supports the workflow where a user creates a blank landing page in HubSpot, pastes the editor URL into the agent, and lets the agent update that draft.

You can override the portal default template path per command or per config via:

```bash
hubspot-page-builder init --default-template-path "@hubspot/elevate/templates/blank.hubl.html"
```

## Skill Installation

### Claude

Copy or symlink [skills/hubspot-page-builder](skills/hubspot-page-builder) into `~/.claude/skills/`.

### OpenClaw

Add the same skill folder to your OpenClaw skills directory or workspace skills collection.

### skills.sh

Structure the repo so it can be installed from GitHub with the skills ecosystem:

```bash
npx skills add <owner>/<repo> --skill hubspot-page-builder
```

## Development

```bash
npm test
npm run lint
npm run build
```

The smoke test is env-gated and expects a real HubSpot token:

```bash
npm run smoke
```

## Notes

- Raw HTML is the public content model for v1
- Raw HTML body editing is only supported on the verified blank landing page template: `@hubspot/elevate/templates/blank.hubl.html`
- Scaffolded Elevate templates such as event/signup/info layouts are not safe for raw HTML body replacement and are treated as unsupported for body editing
- Internally the blank-template flow maps HTML into a single `@hubspot/rich_text` DnD section
- Pages are always draft-first
- Preview URLs are best effort and may be `null`
- If your portal has a specific safe landing page template, set `HUBSPOT_DEFAULT_TEMPLATE_PATH` or store `defaultTemplatePath` in config
