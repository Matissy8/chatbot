#!/usr/bin/env bash

set -euo pipefail

PROJECT_NAME="${VERCEL_PROJECT_NAME:-chatbot}"
CUSTOM_DOMAIN="${1:-${VERCEL_CUSTOM_DOMAIN:-}}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$PROJECT_DIR"

printf '🚀 Deploying %s from %s\n' "$PROJECT_NAME" "$PROJECT_DIR"

export NEXT_TELEMETRY_DISABLED=1
printf '🔒 Next.js telemetry is disabled.\n'

if command -v vercel >/dev/null 2>&1; then
  VERCEL_CMD=(vercel)
else
  if ! command -v npx >/dev/null 2>&1; then
    echo 'Error: install Node.js/npm (npx) or the Vercel CLI first.' >&2
    exit 1
  fi
  VERCEL_CMD=(npx --yes vercel@latest)
fi

if ! "${VERCEL_CMD[@]}" whoami >/dev/null 2>&1; then
  echo 'Error: Vercel CLI is not authenticated. Run `vercel login`, then retry.' >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/.vercel/project.json" ]]; then
  printf '🔗 Linking this directory to Vercel project "%s"…\n' "$PROJECT_NAME"
  "${VERCEL_CMD[@]}" link --yes --project "$PROJECT_NAME"
fi

if [[ -n "$CUSTOM_DOMAIN" ]]; then
  if [[ "$CUSTOM_DOMAIN" == "your-domain.com" || "$CUSTOM_DOMAIN" == *"://"* || "$CUSTOM_DOMAIN" == */* ]]; then
    echo 'Error: provide a real hostname only, e.g. example.com (no protocol or path).' >&2
    exit 1
  fi
  printf '🌐 Adding %s to Vercel project %s…\n' "$CUSTOM_DOMAIN" "$PROJECT_NAME"
  "${VERCEL_CMD[@]}" domains add "$CUSTOM_DOMAIN" "$PROJECT_NAME"
fi

printf '⚡ Starting production deployment…\n'
"${VERCEL_CMD[@]}" deploy --prod --yes

if [[ -n "$CUSTOM_DOMAIN" ]]; then
  printf '\nCheck the domain and DNS status in Vercel → Project → Settings → Domains.\n'
  printf 'Configure the DNS records shown there at your domain registrar; this script does not modify registrar DNS.\n'
fi

printf '✅ Vercel deployment command completed. Check the deployment status in the Vercel dashboard.\n'
