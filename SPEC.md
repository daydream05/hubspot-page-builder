# HubSpot Landing Page MCP Server — Spec

## Problem

Non-technical HubSpot users want to create landing pages using AI (Claude, ChatGPT, etc.) without touching code or the drag-and-drop editor. HubSpot's existing MCP server has two pieces:

1. **Remote MCP** — CRM only (contacts, deals, tickets). No CMS.
2. **Developer MCP** — creates CMS templates/modules (developer scaffolding). Doesn't create actual pages with content.

**The gap:** No tool lets you say "Build me a landing page for my webinar" and have a ready-to-preview page appear in HubSpot.

## Solution

An MCP server that wraps HubSpot's CMS Pages API (`/cms/v3/pages/landing-pages`) to let AI assistants create, populate, and publish landing pages from natural language prompts.

## Target User

Non-technical marketer who uses HubSpot + Claude (or any MCP client). They describe what they want in plain English, the AI handles the rest.

## Architecture

```
User prompt → AI Client (Claude/Cursor/etc.)
                ↓
         MCP Server (this project)
                ↓
         HubSpot CMS Pages API v3
                ↓
         Draft page in HubSpot → Preview → Publish
```

### Tech Stack
- **Runtime:** Node.js (TypeScript)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Transport:** stdio (local) + streamable HTTP (remote option)
- **Auth:** HubSpot Private App access token (user provides once)
- **API:** HubSpot CMS Pages API v3

## MCP Tools

### Core Tools

#### `list_templates`
List available landing page templates in the user's HubSpot account.
- Helps AI pick the right template for the page
- Returns: template name, path, preview thumbnail URL

#### `list_pages`
List existing landing pages (with filters).
- Params: `status` (draft/published/all), `search` (name query), `limit`, `sort`
- Returns: page id, name, slug, status, updated date, URL

#### `get_page`
Get full details of a specific landing page.
- Params: `pageId`
- Returns: complete page data including layoutSections, meta, content

#### `create_page`
Create a new landing page as draft.
- Params:
  - `name` (required) — page name in HubSpot
  - `slug` (required) — URL path
  - `templatePath` (optional) — template to use, defaults to account default
  - `htmlContent` (required) — full HTML content for the page body
  - `metaDescription` (optional) — SEO meta description
  - `headHtml` (optional) — custom CSS/JS in `<head>`
  - `footerHtml` (optional) — custom JS before `</body>`
- Returns: page id, preview URL, edit URL

#### `update_page`
Update a draft page's content.
- Params: `pageId`, plus any fields from `create_page`
- Only updates provided fields (sparse update)

#### `publish_page`
Push a draft page live.
- Params: `pageId`
- Returns: live URL

#### `unpublish_page`
Revert a published page to draft.
- Params: `pageId`

#### `clone_page`
Clone an existing page as a starting point.
- Params: `sourcePageId`, `newName`, `newSlug`
- Returns: new page id, preview URL

#### `delete_page`
Archive/delete a page.
- Params: `pageId`

### Utility Tools

#### `get_account_info`
Get HubSpot portal info (domain, default template, theme).
- Returns: portal ID, primary domain, available themes

#### `preview_url`
Get the preview URL for a draft page.
- Params: `pageId`
- Returns: preview URL that works without publishing

## MCP Resources

#### `hubspot://templates`
List of available templates (cached, refreshed on demand).

#### `hubspot://pages`
List of recent pages for context.

#### `hubspot://domains`
Available domains for the account.

## MCP Prompts

#### `create_landing_page`
Pre-built prompt that guides the AI through the page creation flow:
1. Ask user what the page is for
2. Check available templates
3. Generate content (hero, sections, CTA, form)
4. Create the page as draft
5. Return preview link for approval
6. Publish on confirmation

#### `improve_landing_page`
Takes an existing page ID, fetches content, suggests improvements.

#### `clone_and_customize`
Clone a high-performing page and customize it for a new campaign.

## Setup Flow (for non-technical users)

1. Create a HubSpot Private App:
   - Go to HubSpot → Settings → Integrations → Private Apps
   - Create app with scopes: `content` (CMS read/write)
   - Copy access token

2. Install the MCP server:
   ```bash
   npx hubspot-landing-page-mcp init
   ```
   - Prompts for access token
   - Writes config to `~/.hubspot-lp-mcp/config.json`
   - Adds itself to Claude Desktop config

3. Open Claude Desktop → "Create a landing page for my upcoming webinar about AI in marketing"

## API Reference

### HubSpot CMS Pages API v3

**Base URL:** `https://api.hubapi.com/cms/v3/pages/landing-pages`

**Auth:** `Authorization: Bearer {access_token}`

**Required scope:** `content`

**Key endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List pages (supports filters, pagination) |
| POST | `/` | Create page |
| GET | `/{pageId}` | Get page |
| PATCH | `/{pageId}` | Update page |
| DELETE | `/{pageId}` | Archive page |
| POST | `/{pageId}/draft/push-live` | Publish draft |
| POST | `/{pageId}/draft/reset` | Discard draft changes |
| POST | `/clone` | Clone page |
| POST | `/batch/create` | Batch create |
| POST | `/batch/update` | Batch update |

**Create page payload:**
```json
{
  "name": "Webinar: AI in Marketing",
  "slug": "webinar-ai-marketing",
  "templatePath": "@hubspot/landing_page_default",
  "htmlTitle": "Free Webinar: AI in Marketing | Your Company",
  "metaDescription": "Join our free webinar on how AI is transforming marketing...",
  "layoutSections": {},
  "widgets": {},
  "headHtml": "<style>/* custom CSS */</style>",
  "footerHtml": ""
}
```

**Page states:**
- Created → DRAFT
- `push-live` → PUBLISHED
- Update published page → creates new DRAFT version
- `push-live` again → publishes updated draft

## Content Generation Strategy

The AI (not the MCP server) handles content generation. The MCP server is a dumb pipe to HubSpot. The magic is in:

1. **Template awareness** — the AI knows what templates are available and their structure
2. **Brand context** — user can provide brand guidelines once, AI remembers
3. **Smart defaults** — sensible slug generation, meta descriptions, mobile-responsive HTML
4. **Preview-first** — always create as draft, show preview, publish only on confirmation

### HTML Content Approach

Two strategies, configurable:

**A. Raw HTML mode (MVP)**
- AI generates complete, responsive HTML for the page body
- Works with `@hubspot/landing_page_default` or any "blank" template
- Maximum flexibility, no dependency on HubSpot modules
- Downside: content isn't editable in HubSpot's drag-and-drop editor

**B. Module-based mode (v2)**
- AI generates `layoutSections` JSON matching HubSpot's module schema
- Content appears in HubSpot's visual editor as individual blocks
- Editable by non-technical users after creation
- Requires mapping to specific template module slots
- More complex but better UX for ongoing editing

**MVP ships with Raw HTML mode.** Module-based mode is a fast follow.

## File Structure

```
hubspot-landing-page-mcp/
├── src/
│   ├── index.ts              # MCP server entrypoint
│   ├── server.ts             # MCP server setup + tool registration
│   ├── tools/
│   │   ├── pages.ts          # create, update, publish, clone, delete
│   │   ├── templates.ts      # list templates
│   │   └── account.ts        # account info, domains
│   ├── resources/
│   │   ├── templates.ts
│   │   ├── pages.ts
│   │   └── domains.ts
│   ├── prompts/
│   │   ├── create-landing-page.ts
│   │   ├── improve-landing-page.ts
│   │   └── clone-and-customize.ts
│   ├── hubspot/
│   │   ├── client.ts         # HubSpot API client wrapper
│   │   └── types.ts          # API types
│   └── config.ts             # Configuration loading
├── bin/
│   └── cli.ts                # npx init command
├── package.json
├── tsconfig.json
├── CLAUDE.md                 # Agent context for Codex
├── README.md
└── LICENSE                   # MIT
```

## MVP Scope (v0.1)

**In:**
- `create_page` (raw HTML mode)
- `list_pages`
- `get_page`
- `update_page`
- `publish_page`
- `list_templates`
- `preview_url`
- `create_landing_page` prompt
- stdio transport
- `npx init` setup wizard

**Out (v0.2+):**
- Module-based content mode (layoutSections)
- Streamable HTTP transport (remote hosting)
- `clone_page`
- `improve_landing_page` prompt
- A/B testing tools
- Form integration tools
- Image upload via File Manager API
- Analytics tools (page performance)
- Batch operations

## Open Questions

1. **Template discovery:** How rich is the template metadata from the API? Can we infer section slots programmatically, or do we need manual mapping?
2. **Form embedding:** HubSpot forms are separate (Forms API). For lead gen pages, we'll need to embed form snippets. Include in MVP or defer?
3. **Custom domains:** Pages publish to the account's connected domain. Need to handle multi-domain accounts.
4. **Rate limits:** HubSpot API has rate limits (100 requests/10 seconds for private apps). Not a concern for interactive use, but note for batch operations.

## Competitive Landscape

| Tool | What it does | Gap |
|------|-------------|-----|
| HubSpot Remote MCP | CRM data (contacts, deals) | No CMS/pages |
| HubSpot Dev MCP | Template/module scaffolding | Creates templates, not pages with content |
| HubSpot Breeze AI | Copy assistance in editor | Still requires manual editor work |
| This project | Full page creation from prompt → draft → publish | ✅ The missing piece |

## Success Metrics

- User can go from prompt to preview URL in <60 seconds
- Pages are mobile-responsive out of the box
- Non-technical user can set up in <5 minutes
- Works with Claude Desktop, Cursor, and any MCP client
