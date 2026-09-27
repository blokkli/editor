#!/usr/bin/env bash
#
# Runs the repo's verification gates and writes the FULL output of every gate
# to a log file under tmp/verify-output/. The console only shows a compact
# per-gate summary — when a gate fails, read the log file instead of re-running
# gates piped through tail/grep.
#
# Usage:
#   bun run verify              # all gates EXCEPT e2e
#   bun run verify -- <gate>    # run a single gate
#
# Gates:
#   format      format:fix (oxfmt + prettier, writes fixes)
#   lint        lint:fix (oxlint + eslint, writes fixes)
#   typecheck   all five typecheck targets
#   typecheck:build | typecheck:runtime | typecheck:server | typecheck:playground
#   typecheck:playground-drupal (needs the ddev Nuxt daemon's .nuxt; skipped
#     without it)
#   php         phpcs and phpstan over drupal/web/modules/custom (skipped
#     without PHP or drupal/vendor)
#   unit        vitest unit tests
#   e2e         vitest E2E tests (requires the playground on localhost:3000)

set -u -o pipefail

cd "$(dirname "$0")/.." || exit 1

LOG_DIR="tmp/verify-output"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d--%H-%M-%S).txt"

PASSED=()
FAILED=()
E2E_SKIPPED=0
PLAYGROUND_DRUPAL_SKIPPED=0
PHP_SKIPPED=0

run_gate() {
  local name="$1"
  shift
  local start duration status
  printf '▶ %s ...\n' "$name"
  {
    printf '\n============================================================\n'
    printf '=== GATE: %s\n' "$name"
    printf '=== CMD:  %s\n' "$*"
    printf '============================================================\n'
  } >>"$LOG_FILE"
  start=$SECONDS
  if "$@" >>"$LOG_FILE" 2>&1; then
    status=0
  else
    status=$?
  fi
  duration=$((SECONDS - start))
  printf '=== END GATE: %s (exit %s, %ss)\n' "$name" "$status" "$duration" \
    >>"$LOG_FILE"
  if [ "$status" -eq 0 ]; then
    printf '  ✓ %s (%ss)\n' "$name" "$duration"
    PASSED+=("$name")
  else
    printf '  ✗ %s FAILED (exit %s, %ss)\n' "$name" "$status" "$duration"
    FAILED+=("$name")
  fi
}

gate_e2e() {
  # The E2E suite runs against an already-running playground. Fail fast with a
  # clear message instead of letting every spec time out.
  if ! (exec 3<>/dev/tcp/127.0.0.1/3000) 2>/dev/null; then
    printf '  ✗ test:e2e FAILED: playground is not running on localhost:3000\n'
    printf '    Start it first: bun run dev (or dev:build && dev:start)\n'
    FAILED+=("test:e2e (playground not running)")
    return
  fi
  run_gate "test:e2e" bun run test:e2e
}

# playground-drupal's .nuxt is written by the Nuxt daemon in ddev. Without ddev
# (working on the mock playground only), skip the gate instead of failing it.
gate_typecheck_playground_drupal() {
  if [ ! -f playground-drupal/.nuxt/tsconfig.app.json ]; then
    printf '  - typecheck:playground-drupal SKIPPED (no playground-drupal/.nuxt)\n'
    PLAYGROUND_DRUPAL_SKIPPED=1
    return
  fi
  run_gate "typecheck:playground-drupal" bun run typecheck:playground-drupal
}

# The custom Drupal modules' PHP. drupal/vendor comes from composer install in
# ddev; PHP from the host or the container, wherever this runs.
gate_php() {
  if ! command -v php >/dev/null 2>&1 || [ ! -f drupal/vendor/bin/phpcs ]; then
    printf '  - phpcs, phpstan SKIPPED (no php or no drupal/vendor)\n'
    PHP_SKIPPED=1
    return
  fi
  run_gate "phpcs" bash -c 'cd drupal && php vendor/bin/phpcs'
  run_gate "phpstan" bash -c \
    'cd drupal && php vendor/bin/phpstan analyse --no-progress --memory-limit=1G'
}

# bun run passes a literal "--" through on some versions — ignore it.
if [ "${1:-}" = "--" ]; then
  shift
fi
GATE="${1:-}"

printf 'Verification gates — full log: %s\n\n' "$LOG_FILE"
printf 'Started %s, gate argument: %s\n' "$(date -Iseconds)" "${GATE:-<none>}" \
  >>"$LOG_FILE"

# oxfmt/prettier print one "(unchanged)" line per file — pure noise in the
# log. Strip it while preserving the command's exit code via pipefail.
gate_format() {
  run_gate "format:fix" bash -c \
    'set -o pipefail; bun run format:fix 2>&1 | sed "/(unchanged)/d"'
}

case "$GATE" in
  '')
    gate_format
    run_gate "lint:fix" bun run lint:fix
    run_gate "typecheck:build" bun run typecheck:build
    run_gate "typecheck:runtime" bun run typecheck:runtime
    run_gate "typecheck:server" bun run typecheck:server
    run_gate "typecheck:playground" bun run typecheck:playground
    gate_typecheck_playground_drupal
    gate_php
    run_gate "test:unit" bun run test:unit
    E2E_SKIPPED=1
    ;;
  format | format:fix)
    gate_format
    ;;
  lint | lint:fix)
    run_gate "lint:fix" bun run lint:fix
    ;;
  typecheck)
    run_gate "typecheck:build" bun run typecheck:build
    run_gate "typecheck:runtime" bun run typecheck:runtime
    run_gate "typecheck:server" bun run typecheck:server
    run_gate "typecheck:playground" bun run typecheck:playground
    gate_typecheck_playground_drupal
    ;;
  typecheck:build | typecheck:runtime | typecheck:server | typecheck:playground)
    run_gate "$GATE" bun run "$GATE"
    ;;
  typecheck:playground-drupal)
    gate_typecheck_playground_drupal
    ;;
  php | phpcs | phpstan)
    gate_php
    ;;
  unit | test:unit)
    run_gate "test:unit" bun run test:unit
    ;;
  e2e | test:e2e)
    gate_e2e
    ;;
  *)
    printf 'Unknown gate: %s\n' "$GATE" >&2
    printf 'Valid gates: format, lint, typecheck, typecheck:build,\n' >&2
    printf 'typecheck:runtime, typecheck:server, typecheck:playground,\n' >&2
    printf 'typecheck:playground-drupal,\n' >&2
    printf 'php, unit, e2e\n' >&2
    exit 2
    ;;
esac

printf '\n'
if [ "${#FAILED[@]}" -eq 0 ]; then
  printf 'All %s gate(s) passed.\n' "${#PASSED[@]}"
else
  printf 'FAILED gates: %s\n' "${FAILED[*]}"
fi
if [ "$E2E_SKIPPED" -eq 1 ]; then
  printf 'NOTE: E2E tests were NOT run. Run them with: bun run verify -- e2e\n'
fi
if [ "$PLAYGROUND_DRUPAL_SKIPPED" -eq 1 ]; then
  printf 'NOTE: typecheck:playground-drupal was skipped: its .nuxt is generated by\n'
  printf '      the Nuxt daemon in ddev (ddev start).\n'
fi
if [ "$PHP_SKIPPED" -eq 1 ]; then
  printf 'NOTE: phpcs and phpstan were skipped: they need PHP and drupal/vendor\n'
  printf '      (ddev composer install).\n'
fi
printf 'Full output: %s\n' "$LOG_FILE"

[ "${#FAILED[@]}" -eq 0 ]
