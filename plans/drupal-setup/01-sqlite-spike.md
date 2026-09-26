# 01: SQLite spike

- **Status:** done (2026-09-26): **go**
- **Milestone:** M0 Spike
- **Depends on:** –
- **Timebox:** 1 day

## Goal

Find out whether Drupal, `paragraphs_blokkli` and GraphQL work well enough on
SQLite to use one SQLite file per sandbox.

- **If yes:** the whole setup uses SQLite, including local dev. That removes the
  database pool, per-sandbox database users and the import wait.
- **If no:** fall back to MariaDB with one database per sandbox.

## Tasks

- [x] Run the `paragraphs_blokkli` kernel suite (69 test classes) against
      SQLite. The module's own ddev setup supports this with a gitignored
      `phpunit.xml` that forces `SIMPLETEST_DB=sqlite://localhost/:memory:`. The
      setup is ddev-drupal-contrib: `ddev poser`, `ddev symlink-project`,
      `ddev phpunit-parallel`.
- [x] Install a throwaway Drupal 11 site on SQLite with:
  - all `paragraphs_blokkli` submodules
  - `graphql` 5 and `graphql_core_schema`
  - `paragraphs_library` and `scheduler`
  - `search_api` with `search_api_db`
  - `content_translation`, media and media library

  Enable a GraphQL server with every blökkli schema extension.

- [x] Build the GraphQL schema. Then run a scripted sequence of blökkli
      mutations over HTTP with a session cookie: add, move, edit text,
      translate, duplicate, library, publish and schedule. If scripting takes
      too long, defer this end-to-end check to chunk 06 and say so under Notes.
- [x] Test a scheduled publish via `automated_cron` with a short interval.
- [x] Test burst writes: about 50 mutations as fast as possible from two clients
      at once, which is what an agent run during editing looks like. Watch for
      `SQLITE_BUSY` and lock errors, with WAL mode enabled.
- [x] Measure the database file size after install plus content, and how long a
      copy takes.

## Acceptance criteria

- A go/no-go under Notes, listing any failing tests or errors.
- If go: the SQLite settings needed (WAL, busy timeout, …).
- If no-go: the Database decision in `README.md` is switched to MariaDB, and
  chunks 02, 05 and 08 are adjusted.

## Notes

### Verdict: go

SQLite works for the sandbox. No `SQLITE_BUSY`, "database is locked" or other
SQLite errors came up in any test. One SQLite-specific problem did come up (lost
updates through the persistent entity cache), and one setting fixes it. The
other concurrency failures happen on MariaDB too, so they are
`paragraphs_blokkli` bugs, not reasons against SQLite (see
[findings.md](findings.md)).

### Setup

- A throwaway ddev project (`blokkli-sqlite-spike`) laid out like the planned
  repo: Composer root `drupal/`, module checkout at `drupal/paragraphs_blokkli`
  (2.0.x at `32bbcfe`), symlinked in through a Composer path repository.
  `disable_settings_management: true` and a hand-written `settings.php` pointing
  at the SQLite file. The db container (MariaDB 11.8) kept running for the
  comparison runs, so `omit_containers: [db]` was first tested in chunk 02.
- Versions: PHP 8.5.7, SQLite 3.46.1, Drupal 11.4.7, graphql 5.1.0,
  graphql_core_schema 1.0.28, paragraphs 1.23.0, scheduler 2.3.0, search_api
  1.41.0.
- Minimal content model: `page` with `field_paragraphs`, paragraph types `text`
  and `title`, EN/DE/FR with URL prefixes, a library item, and users `admin` and
  `editor`.
- The project directory was on tmpfs. For every timing and concurrency test the
  database was on a disk-backed Docker volume (btrfs on NVMe). ddev's PHP-FPM
  pool allows 8 workers; the machine has 32 cores.
- Clients were Bun scripts on the host, using the session cookie from a form
  login and the same GraphQL mutations the adapter sends.

### Results

- **Kernel suite:** all 69 classes (550 tests) pass on in-memory SQLite with
  core's `run-tests.sh`, in 15 s.
- **Install:** `site:install` plus enabling every module takes about 3 s (on
  tmpfs).
- **GraphQL schema:** builds and exposes all 57 edit mutations.
- **Mutation sequence:** 13 steps all succeed: add, edit, move, duplicate, bulk
  translate (DE), edit (FR), make reusable, add from library, undo, redo,
  publish, add, schedule. A typical mutation takes 40–65 ms, and publish takes
  about 140 ms (dev mode, GraphQL debug on).
- **Scheduled publish:** `automated_cron` with `interval: 60` published both
  scheduled edit states within a minute of the scheduled time.
- **Bursts:** 50 mutations per client. The reader polls `getParagraphsEditState`
  on the first client's page, like SSR or a second editor tab. Final settings
  (below):

  | Scenario                           | Failed | Throughput | p50   | p95    |
  | ---------------------------------- | ------ | ---------- | ----- | ------ |
  | 1 writer + reader                  | 0      | 18/s       | 53 ms | 86 ms  |
  | 2 writers + reader, separate pages | 0      | 35/s       | 54 ms | 76 ms  |
  | 8 writers, separate pages          | 0      | 52/s       | 74 ms | 331 ms |

  Compared with the same site on MariaDB 11.8, 8 writers ran at 150/s (p95 66
  ms), about three times faster. A sandbox has one or two users, so this
  headroom doesn't matter.

- **Size and copy:** after install, the content model and about 60 edited pages,
  the database is 14 MB, or 12 MB after `VACUUM INTO` (0.9 MB gzipped). Copying
  it takes 4–14 ms; a reflink copy (btrfs) takes 1 ms. Public files are 400 KB
  (no media yet).

### SQLite settings to use

Drupal 11.4 already does two things: it enables WAL by default
(`init_commands['wal']`), and it opens transactions with `BEGIN IMMEDIATE`,
which avoids SQLite's lock-upgrade deadlocks. PDO's default busy timeout is 60
s. On top of that:

```php
$databases['default']['default'] = [
  'driver' => 'sqlite',
  'database' => '<outside the docroot>/db.sqlite',
  'namespace' => 'Drupal\\sqlite\\Driver\\Database\\sqlite',
  'autoload' => 'core/modules/sqlite/src/Driver/Database/sqlite/',
  // Safe with WAL: a power loss can lose the last commits, but it can't
  // corrupt the database. Raised 8-writer throughput from 32/s to 52/s.
  'init_commands' => ['synchronous' => 'PRAGMA synchronous=NORMAL'],
];
// Required: see "Lost updates through the persistent entity cache" below.
$settings['cache']['bins']['entity'] = 'cache.backend.memory';
```

### Lost updates through the persistent entity cache (SQLite-specific)

With core's default persistent entity cache, the page the reader polled lost
stored mutations in every run: 1, 14 and 1 of 50 that the server had reported as
successful. Pages without a reader lost nothing, and MariaDB lost nothing. With
the entity cache bin on `cache.backend.memory`, every count matched in three
runs.

Likely mechanism (not traced in detail): the reader loads the edit state row,
then writes it to `cache_entity`. On SQLite, that cache write waits for the
database-wide write lock, so it lands after the writer's commit, which had
deleted the cache entry. The entity cache is cleared by delete, not by cache tag
(its only tag is `entity_field_info`), so the stale entry stays valid. The next
mutation starts from the old edit state. On MariaDB the window is much smaller.
Cache-tag-based bins (render, page, GraphQL results) don't have this problem,
because their checksum is computed when the entry is written.

This affects every content entity, not only edit states. Nodes published while a
page renders could be cached stale too. Hence the memory bin for the whole
entity cache, not just a per-entity-type fix. The cost is about 20% throughput
in the reader scenario; it's per-request memory only.

### Findings for `paragraphs_blokkli`

Moved to [findings.md](findings.md): duplicate edit states (F1), lost mutations
on concurrent writes (F2), the edit state in the persistent entity cache (F3)
and the `clearOutdated` type mismatch (F4).

### Other findings

Recorded in the chunks they affect:

- Drupal 11.4 install gotchas: chunk 03. The Twig 3.30 bug is also F5 in
  [findings.md](findings.md).
- `VACUUM` and the `sqlite3` CLI: chunk 05.
- Stale ddev registration and the resolved repo path: chunk 02.
- `automated_cron` under load: chunk 09.
- PHP 8.5 works with every module and the whole kernel suite.

The spike scripts (`setup.php`, the Bun GraphQL client and burst scripts) are
not in the repo. Everything needed to reproduce the results is above.
