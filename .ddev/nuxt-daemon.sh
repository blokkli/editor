#!/usr/bin/env bash
# Runs the playground-drupal Nuxt dev server in the web container. Started by
# supervisor as the ddev web_extra_daemon "nuxt" (see config.yaml); control it
# with `ddev nuxt`.
set -euo pipefail

# Supervisor sends daemon output to the container log without a prefix, so
# keep a copy for `ddev nuxt logs`.
exec > >(tee -a /tmp/nuxt.log) 2>&1

cd /var/www/html

# Wait instead of exiting: supervisor gives up after a few quick failures.
while [ ! -x node_modules/.bin/nuxi ]; do
  echo "[nuxt] node_modules is missing. Run 'bun install' in the container (ddev ssh)."
  sleep 10
done

# 127.0.0.1: only nginx in this container talks to the dev server.
exec node_modules/.bin/nuxi dev playground-drupal --host 127.0.0.1 --port 3000
