# CLAUDE.md — hubspot-page-builder

## What This Is

HubSpot Page Builder is a skill-backed local tool for creating, updating, previewing, and publishing HubSpot landing pages.

Use the skill bundle in [skills/hubspot-page-builder](skills/hubspot-page-builder) when you want Claude to drive the workflow. Use the command directly when you want deterministic JSON output.

## Core Rule

Do not hand-roll HubSpot HTTP calls if the `hubspot-page-builder` command is available. Prefer the command because it already enforces the expected payload shapes and JSON result envelopes.

## Workflow

1. List templates.
2. Generate the page content.
3. Create the page as draft.
4. Request a preview URL.
5. Revise if needed.
6. Publish only after explicit confirmation.

## Auth

- `HUBSPOT_ACCESS_TOKEN` is the main input.
- Local config may be stored in `~/.hubspot-page-builder/config.json`.

## Commands

- `hubspot-page-builder list-templates`
- `hubspot-page-builder list-pages --status draft`
- `hubspot-page-builder create-page --input -`
- `hubspot-page-builder update-page --input -`
- `hubspot-page-builder preview-url --page-id <id>`
- `hubspot-page-builder publish-page --page-id <id>`
