# Hydration benchmark

Measures what hydration of a server-rendered page costs on the main thread, and
whether a change to blökkli makes it cheaper. It loads production builds in
Chromium, many times, and compares the variants with statistics that hold for
skewed run times.

```bash
bun run bench:hydration -- \
  --url baseline=http://172.22.0.2:3100/en/some/page \
  --url candidate=http://172.22.0.2:3101/en/some/page
```

## Metrics

Ranked by how directly they show the cost of hydration.

| Metric                  | What it is                                                                                         | Noise |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ----- |
| Hydrated components     | Vue component instances in the tree when Nuxt reports hydration done. Every one ran its `setup()`. | none  |
| Blocking until hydrated | Total blocking time of the long tasks that start before hydration is done.                         | low   |
| Total blocking time     | The same over the whole load, until the main thread is quiet for 3 s.                              | low   |
| Longest task            | The longest single task. Above ~200 ms a click feels stuck.                                        | low   |
| Hydrated at             | When Nuxt's root Suspense resolved (`app:suspense:resolve`), from navigation start.                | high  |
| Payload                 | Bytes of `__NUXT_DATA__` in the HTML.                                                              | none  |
| JS transferred          | Encoded bytes of all scripts.                                                                      | none  |

"Hydrated" means Nuxt's `app:suspense:resolve`, not the end of `app.mount()`.
blökkli loads most blocks as async components, and they hydrate after the mount:
on a large page the longest task comes after the mount.

## Method

- **Production builds only.** A dev build hydrates several times slower and with
  different code (dev checks, unbundled modules).
- **A fresh browser context per run**, with the HTTP cache disabled.
- **CPU slowdown 4x and 1x.** 4x approximates a mid-range phone, 1x is the
  machine running the benchmark.
- **Warmup runs** (default 2) are dropped: the first loads warm the server's
  caches.
- **Interleaved, in random order.** Each round runs every variant once, in a new
  order. Drift (thermal throttling, background load) then spreads evenly over
  the variants instead of hitting the last one.
- **Third-party code is blocked** (scripts and requests to other hosts; images,
  fonts and styles still load). Tag managers would otherwise dominate the
  numbers and vary from run to run. `--third-party` keeps it.
- **Median with the 25th–75th percentile**, not the mean: run times are skewed
  (a run is often much slower, never much faster).
- **Changes against the first variant** with a 95 % bootstrap interval of the
  difference of medians. "(n.s.)" means the interval includes 0: the change is
  within noise.
- **Candidates against each other.** With more than one candidate, a second
  table compares every pair. Two candidates can both beat the baseline and still
  be tied with each other: only that table shows it.

Absolute times depend on the machine. Compare variants of one run, not numbers
from different days or machines. The raw samples go to
`tmp/bench-hydration/*.json`, with the machine and the commit.

## Options

| Option                 | Default | Meaning                                                                        |
| ---------------------- | ------- | ------------------------------------------------------------------------------ |
| `--url [label=]URL`    |         | A variant. Repeat it; the first is the baseline. Two labels may share one URL. |
| `--init label=file.js` |         | A script that runs in the page of that variant before its own scripts.         |
| `--header "Name: v"`   |         | An extra request header for every request.                                     |
| `--runs`               | 15      | Measured runs per variant and CPU slowdown.                                    |
| `--warmup`             | 2       | Dropped runs before them.                                                      |
| `--cpu`                | 4 and 1 | CPU slowdown. Repeat it for several.                                           |
| `--third-party`        | off     | Keep third-party code.                                                         |
| `--out`                | tmp/…   | Where the raw samples go.                                                      |
| `--from file.json`     |         | Print the report of recorded samples again, without measuring.                 |

## Against the sandbox site

The sandbox frontend renders on the server only for anonymous users
(`sandbox/frontend/server/middleware/spa.ts`), and anonymous users can't read
anything on the dev site. The benchmark uses its own sandbox, with anonymous
access, and production builds that run next to the dev daemons.

1. A sandbox where anonymous users may read what authenticated users read
   (once):

   ```bash
   ddev drush blokkli-sandbox:create bench
   perms=$(grep -h "view paragraph content\|view media\|access content" \
     sandbox/drupal/config/sync/user.role.authenticated.yml \
     | sed "s/^ *- *'//; s/'$//" | paste -sd, -)
   ddev drush --uri=https://bench.blokkli.ddev.site role:perm:add anonymous \
     "$perms,execute graphql arbitrary graphql requests"
   ```

   Without the paragraph permissions the page renders without its blocks, and
   every variant measures the same empty page. "Hydrated components" shows it:
   about 100 instead of about 250.

2. A production build per variant, each from its own checkout (a git worktree
   under `tmp/`, which the container sees). `bun run sandbox:prepare` once per
   checkout, then:

   ```bash
   ddev exec -d /var/www/html/tmp/worktrees/<name> \
     "SANDBOX_OUTPUT_DIR=/var/www/html/tmp/bench-builds/<variant> node_modules/.bin/nuxi build sandbox/frontend"
   ```

3. Serve each build on its own port:

   ```bash
   ddev exec -d /var/www/html "NITRO_HOST=0.0.0.0 NITRO_PORT=3100 node tmp/bench-builds/<variant>/server/index.mjs"
   ```

4. Run the benchmark on the host against the web container's address
   (`ddev exec hostname -I`). The headers make Drupal pick the sandbox:

   ```bash
   bun run bench:hydration -- \
     --url baseline=http://172.22.0.2:3100/en/topics/building-environment/building-permit/applying-for-a-building-permit \
     --url candidate=http://172.22.0.2:3101/en/topics/building-environment/building-permit/applying-for-a-building-permit \
     --header "X-Forwarded-Host: bench.blokkli.ddev.site" \
     --header "X-Forwarded-Proto: https" --header "X-Forwarded-Port: 443"
   ```

Images don't load at the container's address (Drupal's files aren't behind the
Nuxt server). That changes paint, not the JavaScript this benchmark measures.

## Limits

- No CPU time per component. CDP's `ScriptDuration` stayed flat while a change
  removed a third of the components and 100 ms of blocking time, so the
  benchmark doesn't report it.
- The sandbox pages are small: 248 hydrated components on the building permit
  page, against 1233 on the home page of a real project (www.excellence.ch). A
  saving on the sandbox understates the saving on a real site. Check large
  changes against a real project too: the benchmark takes any URL.
- Long tasks are only reported from 50 ms. At 1x most hydration work of a small
  page stays below that and doesn't show in the blocking times; the component
  count still does.
