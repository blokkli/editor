# 09b: Sandbox banner and sharing

- **Status:** todo
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 09; F1 and F2 for "Invite a colleague"

## Goal

Inside a sandbox, visitors see how long it lasts. They can come back to it, and
bring a colleague.

## Tasks

- [ ] **A banner in the frontend with the remaining time:**
  - normal: 24 h after creation, or 2 h after the last use, whichever comes
    first
  - premium: 7 days
  - The sandbox has to know its expiry: from the control app (e.g. a file in its
    directory), or from the login.
- [ ] **"Link to this sandbox":** a login link that stays valid until the
      sandbox expires. It uses 09's login route, with the sandbox's expiry as
      the token's.
- [ ] **"Invite a colleague":** a second link that logs another seeded user into
      the same sandbox. It shows off comments, mentions, ownership and
      notifications, since all users really do share each page's edit state.

## Acceptance criteria

- The banner shows the right remaining time for a normal and a premium sandbox.
- A saved link logs back in until the sandbox expires.
- Two users edit the same page in one sandbox without losing mutations.

## Notes

From [chunk 09](09-control-plane.md) (2026-10-02):

- **The login route** accepts a token any number of times until it expires. The
  token names the user, so another seeded user needs no change in Drupal.
- **"Invite a colleague" depends on upstream fixes:**
  - `paragraphs_blokkli` doesn't lock the edit state during a mutation, so two
    users editing the same page at once lose mutations (on MariaDB too).
  - Concurrent first access can also create two edit states for one page.
  - These are F1 and F2 in [findings.md](findings.md). Fix them in the module
    first. (From the [SQLite spike](01-sqlite-spike.md), 2026-09-26.)
