# CLAUDE.md — hubspot-landing-page-mcp

## What This Is

An MCP (Model Context Protocol) server that lets AI assistants (Claude, ChatGPT, Cursor, etc.) create, edit, and publish HubSpot landing pages via the CMS Pages API.

**The gap it fills:** HubSpot's own MCP servers handle CRM data and developer scaffolding. Nobody's built the tool that lets a non-technical user say "Build me a landing page for my webinar" and get a ready-to-preview page in HubSpot.

## Read First

- `SPEC.md` — full specification, API reference, architecture, MVP scope
- This file — build instructions and conventions

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 20+
- **MCP SDK:** `@modelcontextprotocol/sdk` (latest)
- **Transport:** stdio (MVP), streamable HTTP (later)
- **API:** HubSpot CMS Pages API v3 (`https://api.hubapi.com/cms/v3/pages/landing-pages`)
- **Auth:** HubSpot Private App access token (Bearer token)
- **Build:** tsup (bundle to single file for npx distribution)
- **Test:** vitest
- **Lint:** eslint + prettier

## Build & Run

```bash
npm install
npm run build     # tsup → dist/index.js
npm run dev       # tsx watch mode for development
npm test          # vitest
npm run lint      # eslint
```

## Architecture

```
src/
├── index.ts              # Entrypoint — creates server, starts stdio transport
├── server.ts             # MCP server setup, registers tools/resources/prompts
├── tools/
│   ├── pages.ts          # create_page, update_page, publish_page, list_pages, get_page
│   ├── templates.ts      # list_templates
│   └── account.ts        # get_account_info, preview_url
├── resources/
│   ├── templates.ts      # hubspot://templates
│   ├── pages.ts          # hubspot://pages
│   └── domains.ts        # hubspot://domains
├── prompts/
│   ├── create-landing-page.ts
│   ├── improve-landing-page.ts
│   └── clone-and-customize.ts
├── hubspot/
│   ├── client.ts         # Thin wrapper around HubSpot REST API (fetch-based, no SDK)
│   └── types.ts          # TypeScript types for API responses
└── config.ts             # Load config from env or config file
```

## Conventions

- **No HubSpot SDK.** Use raw `fetch()` against the REST API. The SDK is bloated and poorly typed for CMS operations. Keep it simple.
- **Every tool returns structured JSON.** The AI client parses it. Include `success: boolean` and either `data` or `error`.
- **Draft-first.** `create_page` always creates drafts. Publishing is a separate explicit action.
- **Error messages should be human-readable.** The AI will relay them to the user.
- **Config via env vars:**
  - `HUBSPOT_ACCESS_TOKEN` — required
  - `HUBSPOT_PORTAL_ID` — optional, auto-detected from token
- **Zod for input validation** on all tool parameters.

## MVP Tools to Implement

See SPEC.md "MVP Scope" section. In priority order:

1. `list_templates` — so the AI can pick a template
2. `create_page` — the core tool (raw HTML mode)
3. `list_pages` — browse existing pages
4. `get_page` — fetch page details
5. `update_page` — edit draft content
6. `publish_page` — push draft live
7. `preview_url` — get preview link for draft
8. `get_account_info` — portal info, domain

## HubSpot API Quick Ref

**Base:** `https://api.hubapi.com/cms/v3/pages/landing-pages`
**Auth:** `Authorization: Bearer {token}`
**Scope needed:** `content`

Key calls:
- `GET /` — list pages
- `POST /` — create page
- `GET /{id}` — get page
- `PATCH /{id}` — update page
- `DELETE /{id}` — archive page
- `POST /{id}/draft/push-live` — publish
- `POST /clone` — clone page

Create payload must include `name` and `templatePath` at minimum. Use `@hubspot/landing_page_default` as fallback template.

## Testing

- Unit tests for each tool (mock the HubSpot API with msw or similar)
- Integration test script that hits a real HubSpot dev portal (optional, needs token)
- Test the MCP server end-to-end using `@modelcontextprotocol/inspector`

## Publishing

Package name: `hubspot-landing-page-mcp`
Users install via: `npx hubspot-landing-page-mcp` (or add to Claude Desktop config)

Claude Desktop config entry:
```json
{
  "mcpServers": {
    "hubspot-landing-pages": {
      "command": "npx",
      "args": ["-y", "hubspot-landing-page-mcp"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "pat-na1-xxxxx"
      }
    }
  }
}
```
