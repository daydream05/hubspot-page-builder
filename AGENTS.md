# AGENTS.md — hubspot-page-builder

## What This Is

A CLI-backed skill for Claude, OpenClaw, and skills.sh that creates and publishes HubSpot landing pages through the CMS Pages API.

The command is the execution layer. The skill is the portable artifact.

## Read First

- [SPEC.md](SPEC.md)
- [README.md](README.md)
- [skills/hubspot-page-builder/SKILL.md](skills/hubspot-page-builder/SKILL.md)

## Conventions

- No HubSpot SDK. Use raw `fetch()`.
- Every command returns structured JSON.
- Draft-first page creation.
- Human-readable error messages.
- `HUBSPOT_ACCESS_TOKEN` is the primary auth input.
- Skill scripts are thin helpers only. Product logic lives in `src/`.

## Architecture

```text
Agent skill
  -> local command: hubspot-page-builder
  -> TypeScript core library
  -> HubSpot CMS Pages API
```

## Main Runtime Areas

```text
src/
  cli.ts
  config.ts
  page-builder.ts
  hubspot/
    client.ts
    payloads.ts
skills/
  hubspot-page-builder/
    SKILL.md
    references/cli-contract.md
    scripts/doctor.sh
```

## Commands

- `init`
- `get-account-info`
- `list-templates`
- `list-pages`
- `get-page`
- `create-page`
- `update-page`
- `publish-page`
- `preview-url`

## Testing

- Unit tests for config, payloads, HubSpot client behavior, service behavior, and command output
- Smoke test against a real portal via `npm run smoke`
