#!/usr/bin/env bash
set -euo pipefail

if ! command -v hubspot-page-builder >/dev/null 2>&1; then
  echo "hubspot-page-builder command not found"
  echo "Build or install the command before using this skill."
  exit 1
fi

CONFIG_PATH="${HOME}/.hubspot-page-builder/config.json"

if [[ -n "${HUBSPOT_ACCESS_TOKEN:-}" ]]; then
  echo "HUBSPOT_ACCESS_TOKEN is set"
  exit 0
fi

if [[ -f "${CONFIG_PATH}" ]]; then
  echo "Found config at ${CONFIG_PATH}"
  exit 0
fi

echo "No HubSpot auth found."
echo "Set HUBSPOT_ACCESS_TOKEN or run: hubspot-page-builder init --access-token <token>"
exit 1
