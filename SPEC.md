# HubSpot Page Builder — Spec

## Problem

Non-technical HubSpot users want an agent to build landing pages from plain English without using the drag-and-drop editor by hand.

HubSpot’s existing MCP and developer tooling do not solve that workflow directly. The missing piece is a draft-first page builder that an agent can operate safely.

## Solution

Build a **CLI-backed skill** that wraps HubSpot’s CMS Pages API and exposes a stable local command:

```text
Agent skill -> hubspot-page-builder -> HubSpot CMS Pages API
```

The command is the runtime. The skill is the portable orchestration layer for Claude, OpenClaw, and skills.sh.

## Target User

Non-technical marketers and AI operators who want an agent to create a draft page in HubSpot from a prompt and a bearer token.

## Product Shape

### 1. Core library

Typed TypeScript helpers for:

- page creation
- page updates
- template discovery
- publish flow
- preview lookup
- account/domain inspection

### 2. Local command

Executable: `hubspot-page-builder`

All commands return JSON:

```json
{
  "success": true,
  "data": {}
}
```

### 3. Skill bundle

Portable skill folder:

```text
skills/hubspot-page-builder/
  SKILL.md
  references/cli-contract.md
  scripts/doctor.sh
```

## Command Surface

### Read-only

- `get-account-info`
- `list-templates`
- `list-pages`
- `get-page`
- `preview-url`

### Mutating

- `init`
- `create-page`
- `update-page`
- `publish-page`

Mutating commands accept JSON payloads through `--input <file>` or `--input -`.

## Auth and Config

- `HUBSPOT_ACCESS_TOKEN` is required for API access
- `HUBSPOT_PORTAL_ID` is optional
- `HUBSPOT_DEFAULT_TEMPLATE_PATH` is optional and overrides the built-in fallback of `@hubspot/elevate/templates/blank.hubl.html`
- Local config path: `~/.hubspot-page-builder/config.json`
- Precedence:
  - command flags
  - env vars
  - config file

## API

### Base URLs

- Pages: `https://api.hubapi.com/cms/v3/pages/landing-pages`
- Templates: `https://api.hubapi.com/content/api/v2/templates`
- Domains: `https://api.hubapi.com/cms/v3/domains`
- Account info: `https://api.hubapi.com/account-info/v3/details`

### Content strategy

The public interface is raw HTML.

Internally the builder converts `htmlContent` into a single DnD area with one `@hubspot/rich_text` widget. This is only supported for the verified blank landing page template (`@hubspot/elevate/templates/blank.hubl.html`) and intentionally avoids module-slot mapping in v1.

To avoid portal-specific template mismatches, the tool supports a configurable `defaultTemplatePath` in env or stored config.

## Default Workflow

1. Check templates.
2. Generate content.
3. Create a draft page.
4. Return preview details.
5. Revise.
6. Publish only on explicit approval.

## Non-Goals for v1

- MCP transport
- hosted OAuth/multi-account auth
- generic module-based editing
- scaffolded-template body editing
- image uploads
- A/B testing
- analytics features
