# 09b: Sandbox banner and sharing

- **Status:** in progress (2026-10-06)
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 09; F1 and F2 for "Invite a colleague" (fixed)

## Goal

Inside a sandbox, visitors see how long it lasts. They can come back to it, and
bring a colleague.

## Tasks

- [x] **A "Sandbox" button in the frontend with the expiry:**
  - normal: 24 h after creation, or 2 h after the last use, whichever comes
    first
  - premium: 7 days
  - The control app passes the limits to `blokkli-sandbox:create`, which writes
    them to `sandboxes/<id>/lifetime.json`.
- [x] **"Link to this sandbox":** a login link that stays valid until the
      sandbox expires. It uses 09's login route, with the sandbox's expiry as
      the token's.
- [x] **"Invite a colleague":** links that log the other seeded users into the
      same sandbox. They show off comments, mentions, ownership and
      notifications, since all users really do share each page's edit state.
- [ ] **The links in the editor and on phones:** the button shows with the local
      tasks only, from lg and outside the editor (see Notes). In the editor,
      e.g. an entry in its menu: the page can't be clicked there.

## Acceptance criteria

- The popup shows the right expiry for a normal and a premium sandbox.
- A saved link logs back in until the sandbox expires.
- Two users edit the same page in one sandbox without losing mutations.

## Notes

The button (2026-10-06):

- **Where:** a "Sandbox" button right of the local tasks
  (`components/SandboxInfo` in `layouts/drupal.vue`), in Gin's style like
  vuepal's tabs, with a popup.
  - A full-width banner above the toolbar came first. With the toolbar, the
    local tasks, the site's banner and the navigation, visitors got five bars
    (the user).
  - The popup is open until the visitor closes it. localStorage keeps it closed,
    per sandbox: each one is its own origin.
  - It shows where the toolbar does: from lg, and not in the editor or a
    preview. Visitors land in the editor, so they first see it when they leave
    it.
  - The editor lays a canvas over the page that catches every click
    (`src/runtime/editor/components/AnimationCanvas/index.vue`), so nothing on
    the page could be used there anyway.
- **The expiry is a date, not a countdown** (the user): "Your sandbox is deleted
  on 7 October at 14:32, or after 2 hours without use." A countdown would mostly
  read "2 h", and jump with every request.
- **"Invite a colleague" lists every other test user,** with their role (the
  user). Marc, the head of department, can't edit, so two people editing at once
  need Jonas, the restricted editor.
- **How the sandbox knows its limits:**
  - The claim passes `--expires` (the hard limit) and, for normal sandboxes,
    `--idle` to `blokkli-sandbox:create`.
  - The control app's database stays the cleanup's source; the file only mirrors
    it.
  - Sandboxes made with drush get no file, and no button.
- **Drupal makes the links:**
  - `Query.sandbox` (`blokkli_sandbox`'s schema extension) has the limits and a
    login per test user, until the hard limit.
  - The token code moved from `SandboxLoginController` to the `LoginToken`
    service, which makes and checks them.
  - Any logged-in user of the sandbox gets every test user's link: they're all
    the visitor and the colleagues they invited.
  - `sandbox` is null for anonymous visitors (preview grants included), on the
    dev site, and without the file.
- **Checked over HTTP:**
  - On a1, recreated with the options: four logins, role labels in EN and DE.
  - Marc's link logs a fresh session in as Marc. A changed token gets 403.
  - `sandbox` is null on b2 (no options), on the dev site, and for a preview
    grant holder.
  - **Claims through the control app** write the matching file:
    - normal: created plus 24 h, idle 7200;
    - premium (an invitation): plus 7 days, idle null.
- **Left for the browser:**
  - the button and its popup in EN, DE and FR;
  - open at first, closed after a reload once closed;
  - the copy buttons;
  - two users on one page (the acceptance criterion).

From [chunk 09](09-control-plane.md) (2026-10-02):

- **The login route** accepts a token any number of times until it expires. The
  token names the user, so another seeded user needs no change in Drupal.
- **"Invite a colleague" depends on upstream fixes:**
  - `paragraphs_blokkli` doesn't lock the edit state during a mutation, so two
    users editing the same page at once lose mutations (on MariaDB too).
  - Concurrent first access can also create two edit states for one page.
  - These are F1 and F2 in [findings.md](findings.md). Fix them in the module
    first. (From the [SQLite spike](01-sqlite-spike.md), 2026-09-26.)
