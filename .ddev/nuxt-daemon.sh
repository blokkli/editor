#!/usr/bin/env bash
# Runs a Nuxt server in the web container: the sandbox frontend
# (`nuxt-daemon.sh frontend 3000`) or the control app (`control 3001`). The dev
# server locally, the production build when hosted (IS_DDEV_HOSTED=true).
# Started by supervisor as a ddev web_extra_daemon (see config.yaml); control
# them with `ddev nuxt [control]`.
set -euo pipefail

app="$1"
port="$2"

# Supervisor sends daemon output to the container log without a prefix, so
# keep a copy for `ddev nuxt [control] logs`.
exec > >(tee -a "/tmp/nuxt-$app.log") 2>&1

cd /var/www/html

# Never a dev server when hosted: it serves any file of the repository (the
# databases, .ddev/.env.web) and runs Nitro's tasks for anyone. `ddev deploy`
# builds the apps (`bun run sandbox:build`).
if [ "${IS_DDEV_HOSTED:-}" = true ]; then
  server="sandbox/$app/.output/server/index.mjs"
  # Wait instead of exiting: supervisor gives up after a few quick failures.
  while [ ! -f "$server" ]; do
    echo "[$app] There's no production build. Run 'ddev deploy', or 'bun run sandbox:build' in the container."
    sleep 10
  done
  NITRO_HOST=127.0.0.1 NITRO_PORT="$port" exec node "$server"
fi

# Wait instead of exiting: supervisor gives up after a few quick failures.
while [ ! -x node_modules/.bin/nuxi ]; do
  echo "[$app] node_modules is missing. Run 'bun install' in the container (ddev ssh)."
  sleep 10
done

# 127.0.0.1: only nginx in this container talks to the dev server.
exec node_modules/.bin/nuxi dev "sandbox/$app" --host 127.0.0.1 --port "$port"
