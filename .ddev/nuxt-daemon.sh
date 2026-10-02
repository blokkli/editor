#!/usr/bin/env bash
# Runs a Nuxt dev server in the web container: the sandbox frontend
# (`nuxt-daemon.sh frontend 3000`) or the control app (`control 3001`).
# Started by supervisor as a ddev web_extra_daemon (see config.yaml); control
# them with `ddev nuxt [control]`.
set -euo pipefail

app="$1"
port="$2"

# Supervisor sends daemon output to the container log without a prefix, so
# keep a copy for `ddev nuxt [control] logs`.
exec > >(tee -a "/tmp/nuxt-$app.log") 2>&1

cd /var/www/html

# Wait instead of exiting: supervisor gives up after a few quick failures.
while [ ! -x node_modules/.bin/nuxi ]; do
  echo "[$app] node_modules is missing. Run 'bun install' in the container (ddev ssh)."
  sleep 10
done

# 127.0.0.1: only nginx in this container talks to the dev server.
exec node_modules/.bin/nuxi dev "sandbox/$app" --host 127.0.0.1 --port "$port"
