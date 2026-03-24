---
name: hubspot-page-builder
description: Use this skill when creating, updating, or publishing HubSpot landing pages through the local `hubspot-page-builder` command. Works for Claude, OpenClaw, and skills.sh style skill installs.
---

# HubSpot Page Builder

Use this skill when the user wants to create or modify a HubSpot landing page and the `hubspot-page-builder` command is available.

## What this skill does

- selects and inspects HubSpot templates
- creates draft landing pages from raw HTML
- updates draft content and metadata
- publishes only after explicit confirmation

## Required runtime

- local command: `hubspot-page-builder`
- auth via `HUBSPOT_ACCESS_TOKEN` or `~/.hubspot-page-builder/config.json`
- optional portal default template via `HUBSPOT_DEFAULT_TEMPLATE_PATH` or stored `defaultTemplatePath`

Run `scripts/doctor.sh` if you need to verify the environment first.

## Rules

- Prefer the `hubspot-page-builder` command over direct HTTP calls.
- Treat page creation as draft-first.
- Do not publish without explicit user approval.
- For mutating commands, prefer stdin JSON via `--input -` to avoid shell escaping issues.
- Inspect the JSON response after every command before taking the next action.
- If the user gives a HubSpot editor URL, extract the page ID from the URL and use that page as the update target.
- Raw HTML body editing is only supported for the verified blank landing page template. Do not use it to overwrite scaffolded Elevate templates such as event, signup, info-request, or meeting-booking layouts.
- For blank-template pages, do not trust the HubSpot draft editor canvas as the final preview. Review the rendered published URL instead.
- `preview-url` is optional and may be `null`.

## Workflow

1. If setup is unclear, run the doctor script or ask for the bearer token.
2. Run `hubspot-page-builder list-templates`.
3. Generate the page HTML and metadata from the user’s request.
4. Create a draft with `hubspot-page-builder create-page --input -`.
5. If the user asks for changes, run `hubspot-page-builder update-page --input -`. The input may contain either `pageId` or `pageUrl`.
6. Publish only after explicit confirmation with `hubspot-page-builder publish-page --page-id <id>`.
7. Review the rendered published URL, not just the HubSpot editor canvas, for blank-template pages.

## Command examples

See [references/cli-contract.md](references/cli-contract.md) for payload examples and expected JSON envelopes.
