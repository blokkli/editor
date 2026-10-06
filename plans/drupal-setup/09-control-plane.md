# 09: Control app: claim and invitations

- **Status:** done
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 08

## Goal

Visitors create their own sandbox and land in its editor. Admins hand out
premium sandboxes by invitation. Expired sandboxes disappear.

## Tasks

- [x] ddev and nginx:
  - [x] `blokkli-control.ddev.site`, an additional hostname. Not
        `control.blokkli.ddev.site`: the wildcard would make that a sandbox id.
  - [x] A second nginx server for it, which sends every path to the control app.
        The proxy settings moved into `proxy.inc`, which both public servers
        include.
  - [x] A second daemon, `control` (port 3001): `.ddev/nuxt-daemon.sh` takes the
        app and the port, and `ddev nuxt [control] …` picks the daemon.
  - [x] `blokkli-sandbox` joins the Drupal paths (nginx and `isDrupalPath()`).
  - [x] The unknown-sandbox page links to the claim page, through SSI and
        `$blokkli_control_url`.
  - [x] `ddev check-routes` also checks the control host and the login route.
- [x] Drupal (`blokkli_sandbox`):
  - [x] **The login route,** `/blokkli-sandbox/login/{token}`
        (`SandboxLoginController`):
    - The token is `base64url(JSON {sandbox, user, expires})`, a dot, then the
      base64url HMAC-SHA256 of that part.
    - It answers 403 on the default site, and for a bad signature, another
      sandbox's id, an expired token, or an unknown or blocked user.
    - Otherwise it logs the user in and opens the front page's editor
      (`/<langcode>?blokkliEditing=<uuid>`), in the node's original language.
  - [x] **The secret** is `NUXT_SANDBOX_LOGIN_SECRET`, with a public fallback
        locally. settings.php refuses to run hosted without it.
  - [x] **Last use:** `LastUseSubscriber` touches `sandboxes/<id>/last-use`
        after the response, at most once a minute.
- [x] **The control app** (`sandbox/control/`, a Nuxt app without its own
      `package.json`):
  - [x] **Its database:** SQLite (`node:sqlite`) in `.data/control.sqlite`, with
        two tables, sandboxes and invitations.
  - [x] **The claim page,** `/de`, `/fr` and `/en`, in Blockingen's style:
    - It uses the frontend's theme, fonts and logo.
    - `/` redirects by the browser's language, DE otherwise.
    - The content language is EN, DE or FR, with DE preselected. A language
      without a template is disabled.
  - [x] **The claim** (`POST /api/claim`):
    - **With an invitation:** the invitation is claimed atomically and the
      sandbox is premium.
    - **Without one:** Turnstile (when its keys are set), 3 claims per IP an
      hour, and at most 100 active normal sandboxes.
    - **The id:** 10 random characters, written to the database before the copy,
      without an await in between. Then `drush blokkli-sandbox:create`, and the
      answer is a login URL for Anna Keller, valid for 5 minutes.
  - [x] **`/admin`:**
    - Basic auth with `NUXT_ADMIN_PASSWORD`. Without one, it's open locally and
      answers 503 hosted.
    - It lists the invitations and the sandboxes, and creates invitation links,
      with an optional note.
  - [x] **The cleanup:** a Nitro task, every 5 minutes. It deletes a normal
        sandbox 24 h after its creation, or 2 h after its last use, and a
        premium one after 7 days. Sandboxes made with drush aren't in the
        database and stay.
- [x] Gates:
  - `typecheck:sandbox-control` (app and server) and its verify gate
  - a unit test for the client IP
- [x] Docs: CLAUDE.md, CONTRIBUTING.md, the typecheck skill.

## Acceptance criteria

- [x] **Speed:** locally, a claim and the login take 0.33 s over HTTP. Loading
      the editor afterwards isn't included.
- [x] **Invitations:** a link works once. Two parallel claims with it gave one
      premium sandbox and a 410.
- [x] **Expiry:** expired sandboxes disappear together with their files, and
      those made with drush stay.
- [x] **In the browser (the user, 2026-10-02):**
  - the claim page in all three languages
  - claiming lands in the home page's editor as Anna Keller
  - an invitation link, used twice
  - the unknown-sandbox page's link

## Notes

**Changed in [09c](09c-welcome-page.md) (the user, 2026-10-06):** a claim opens
the welcome page instead of the home page's editor.

Decided with the user (2026-10-02):

- **A separate app with its own database,** not a registry on the default site.
  The default site is a bake product: every bake would wipe the registry.
  Hosted, Drupal serves only sandboxes, and the default site is just the bake
  target.
- **Basic auth** for the admin pages: one password, no users, no library.
- **The claim page** is styled like Blockingen, offers EN, DE and FR (DE
  preselected), and opens the home page's editor.
- **Premium sandboxes come from invitation links** that admins generate. Each
  link creates one premium sandbox.
- **Moved to [09b](09b-sandbox-banner.md):**
  - the banner with the remaining time
  - "Link to this sandbox"
  - "Invite a colleague"
- **`system.private_key` isn't regenerated.** Every core token that uses it also
  mixes in the hash salt, which is per sandbox:
  - CSRF tokens, image style tokens, media iframes, contextual links
  - ManagedFile, MediaLibraryState, PermissionsHashGenerator

Found while building it (2026-10-02):

- **A code change in `blokkli_sandbox` needs a bake.** A sandbox's router and
  container live in its database, so the login route and the subscriber reach
  only sandboxes from a new template. a1 and b2 were recreated.
- **`?check_logged_in=1`:** after `user_login_finalize()`, Drupal adds it to the
  redirect, for login forms. The controller removes the flag from the session,
  so the editor's URL stays clean.
- **`node:sqlite`** comes with Node 22, so there's no dependency:
  - It logs one ExperimentalWarning, which nuxi shows as an ERROR.
  - Nitro doesn't know it as a built-in module yet, hence
    `rollupConfig.external`.
- **Running the cleanup now:**
  `curl https://blokkli-control.ddev.site/_nitro/tasks/sandbox:cleanup`. Only
  the dev server has this route.
- **Locally, every request comes from 172.18.0.1,** the gateway of the router's
  network. So the per-IP limit is shared by all local users.
- **Timings:** the claim takes 0.27 s (a drush bootstrap and the copy), the
  login 0.06 s.
- **Tested with Cloudflare's test secret keys:** `2x…AA` always fails and is
  refused (403), `1x…AA` always passes.
- **A login token is reusable** until it expires.

From the [SQLite spike](01-sqlite-spike.md) (2026-09-26):

- **Cron:**
  - `automated_cron` with a 60 s interval ran scheduled publishes on time.
  - Under load, it logs "Attempting to re-run cron while it is already running"
    on many requests. The lock works; it's just noise.
  - It only runs when the sandbox gets a request, and after the response. So the
    first page view after the scheduled time still shows the old content.
  - A single system cron that runs `drush cron` for each active sandbox would
    avoid that. The lifecycle cleanup now runs in the control app.

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Client IPs:** flood control relies on the client IP. Drupal trusts
  `PRIVATE_SUBNETS` as proxies and gets the real IP from `X-Forwarded-For`,
  which the router sets. The control app reads it the same way
  (`server/utils/clientIp.ts`).

From [chunk 05](05-seed-bake-reset.md) (2026-09-28):

- **The seeded users** (13h):
  - Anna Keller, editor
  - Marc Brunner, head of department (reviews)
  - Élodie Favre, French translator
  - Jonas Weber, restricted editor
- The seeded comment thread mentions Marc, so he has a notification.
- **Dates are relative to the bake:** rebake often, or shift them on claim.
