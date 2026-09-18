---
name: blokkli-setup-scheduling
description: >-
  Set up scheduling of editor changes or individual paragraphs.
license: MIT
compatibility: >-
  Requires @blokkli/editor 2.x with the drupal module and paragraphs_blokkli
  2.x, plus access to the Drupal backend (drush) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li
---

# Support for scheduling paragraphs

blökkli integrates with the `scheduler` contrib module to publish or unpublished
paragraphs.

To set this up:

- Make sure the `scheduler` module is installed and set up
- Install `paragraphs_blokkli_scheduler`
- Enable the `paragraphs_blokkli_scheduler` GraphQL extension

The `scheduler` module requires enabling scheduling for every paragraph bundle
individually. This is a tedious task; you might be able to assist the user, but
since it involves config changes, you might want to tell the developer to first
enable it for a single paragraph, then export config. That way you can see
exactly what needs to be done to enable it for other bundles as well.

# Support for scheduling edit state changes

In addition, the module also enables a feature to schedule pending changes from
an edit state. This does not depend on `scheduler`, but it's part of the same
module: `scheduler` only works on publishing and unpublishing entities; the edit
state is never "published" in a Drupal sense. It only replays and saves the
mutations on the host entity, then deletes itself.

Enabling the `paragraphs_blokkli_scheduler` module automatically enables this
feature as well. It registers a cron hook to handle scheduled publishing of edit
states.
