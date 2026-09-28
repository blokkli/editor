# 09: Control plane: claim and invite

- **Status:** todo
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 08

## Goal

Create, hand out, and delete sandboxes. Normal sandboxes are public and
self-service. Premium sandboxes are created by an admin and handed out by
invitation.

## Tasks

- [ ] A registry in `blokkli_sandbox` on the default site: id, created, last
      access, expiry, premium flag, invited email.
- [ ] Public claim ("Try blökkli"):
  1. captcha (Turnstile), a per-IP rate limit and a cap on active sandboxes
  2. copy the template
  3. register the sandbox
  4. redirect with a short-lived signed token
- [ ] Premium: an admin form creates a premium sandbox (7 days) and an
      invitation link. Email is optional.
- [ ] Login inside the sandbox:
  - [ ] A route verifies the signed token (HMAC with a shared secret, containing
        sandbox id, user and expiry) and logs in the seeded editor.
  - [ ] Regenerate `system.private_key` on first claim. No passwords.
- [ ] "Invite a colleague": a second link that logs another seeded user into the
      same sandbox. It demonstrates comments, mentions, ownership and
      notifications, since edit state really is shared per page.
- [ ] Lifecycle:
  - [ ] Track last access cheaply, e.g. a throttled registry update or file
        mtime.
  - [ ] Cron deletes normal sandboxes after 24h, or after 2h idle, and premium
        ones after 7 days: database and files.
  - [ ] A deploy expires all sandboxes.
- [ ] Frontend: a banner with the remaining time.

## Acceptance criteria

- Locally, from claim to editing a fresh sandbox takes under 2 seconds.
- A premium invitation link works.
- Expired sandboxes disappear together with their files.

## Notes

From the [SQLite spike](01-sqlite-spike.md) (2026-09-26):

- **"Invite a colleague" depends on an upstream fix.** `paragraphs_blokkli`
  doesn't lock the edit state during a mutation, so two users editing the same
  page at the same time lose mutations (on MariaDB too). Concurrent first access
  can also create two edit states for one page. See F1 and F2 in
  [findings.md](findings.md). Fix them in the module before shipping the second
  user.
- **Cron:** `automated_cron` with a 60 s interval ran scheduled publishes on
  time. Under load it logs "Attempting to re-run cron while it is already
  running" on many requests; the lock works, it's just noise. It also only runs
  when the sandbox gets a request, and after the response. So the first page
  view after the scheduled time still shows the old content. Consider a single
  system cron that runs `drush cron` for each active sandbox instead, and use
  the same job for the lifecycle cleanup.

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Client IPs:** the per-IP claim rate limit and flood control rely on the
  client IP. Drupal trusts `PRIVATE_SUBNETS` as proxies and gets the real IP
  from `X-Forwarded-For`, which the router sets.

From [chunk 05](05-seed-bake-reset.md) (2026-09-28):

- **A template per source language:** `ddev bake --source=de` bakes the content
  with German as its original, and EN and FR as translations. Decide which
  templates sandboxes offer, and how a visitor gets theirs (a choice on the
  claim page, or the browser's language).
- **Open the sandbox in its source language.** The frontend's `/` redirects to
  `/en` whatever the template.
- **The seeded users** (13h): Anna Keller (editor), Marc Brunner (head of
  department, reviews), Élodie Favre (French translator), Jonas Weber
  (restricted editor). The seeded comment thread mentions Marc, so he has a
  notification. Dates are relative to the bake: rebake often, or shift them on
  claim.
