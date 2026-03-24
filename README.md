# hubspot-landing-page-mcp

An MCP server that lets AI assistants create, edit, and publish HubSpot landing pages.

> "Build me a landing page for my webinar next Tuesday" → Draft page in HubSpot → Preview → Publish

## The Problem

HubSpot's existing MCP integrations handle CRM data and developer scaffolding. There's no tool that lets non-technical users create actual landing pages through AI assistants.

## What This Does

This MCP server bridges the gap between AI assistants (Claude, ChatGPT, Cursor, etc.) and HubSpot's CMS Pages API. Say what you want in plain English, get a landing page in HubSpot.

**Tools provided:**
- `create_page` — Create a landing page from HTML content
- `list_pages` — Browse existing pages
- `get_page` — Get page details
- `update_page` — Edit draft content
- `publish_page` — Push a draft live
- `list_templates` — See available templates
- `preview_url` — Get a preview link before publishing

## Quick Start

### 1. Create a HubSpot Private App

1. Go to **HubSpot → Settings → Integrations → Private Apps**
2. Create a new app with the `content` scope
3. Copy the access token

### 2. Add to Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hubspot-landing-pages": {
      "command": "npx",
      "args": ["-y", "hubspot-landing-page-mcp"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

### 3. Use It

Open Claude Desktop and try:

- "Create a landing page for my upcoming webinar about AI in marketing"
- "List my existing landing pages"
- "Update the hero section of my webinar page to mention early bird pricing"
- "Publish the webinar landing page"

## How It Works

```
You describe what you want
        ↓
AI generates the content + layout
        ↓
MCP server creates a draft in HubSpot
        ↓
You get a preview link to review
        ↓
Say "publish it" when ready
```

Pages are always created as **drafts first**. You review before anything goes live.

## Development

```bash
git clone https://github.com/daydream05/hubspot-landing-page-mcp.git
cd hubspot-landing-page-mcp
npm install
npm run dev
```

## License

MIT
