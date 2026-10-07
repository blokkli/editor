# 13j: Skill tests

- **Status:** todo, deferred (the user, 2026-10-07)

## Goal

Every skill in `./skills` works for an agent that has only the skill, not this
project's context. The sub-chunks write the skills to the best of our knowledge;
this chunk tests them (the user, 2026-09-26).

## Tasks

- [ ] Decide how to replay a skill without breaking the dev site:
  - the baseline is the commit before the sub-chunk that wrote the skill (hence
    one commit per sub-chunk)
  - a git worktree, installed from its own config, e.g. as a second ddev project
    or a sandbox (chunk 08)
- [ ] Per skill: a fresh agent gets the skill and a task ("set up templates")
      and applies it. Compare its config and frontend changes with the
      reference, fix the skill, and repeat until it passes.
- [ ] Include the skills written before this plan (host options, templates,
      scheduling, analyze).

## Acceptance criteria

- Every skill passes a replay, or its known gaps are written into the skill.

## Notes

From chunk 05 (2026-09-28):

- **The baseline site is a bake:** `ddev bake` installs from config and seeds
  `sandbox/drupal/content`; a worktree bakes its own. `ddev reset` restores the
  site between replays.
