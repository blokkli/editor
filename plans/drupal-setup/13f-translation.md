# 13f: Translation

- **Status:** todo
- **Milestone:** M1 Local dev site
- **Depends on:** 13c
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

Editors translate pages in the editor, with DeepL, and see which translations
are outdated. In Blockingen/Bloquens, German and French are both real languages
of the town (14a); English is the site's source language. Visitors can switch
the language.

## Tasks

- [ ] Translation settings for every bundle and field from 13b and 13c:
      paragraph fields translatable, the hosts' paragraphs fields not; decide
      per structured field (e.g. an event's date isn't translated, its place
      is).
- [ ] DeepL via `paragraphs_blokkli_deepl`. The key comes from the environment
      (chunk 03); never enter it in the settings form, which stores it in
      config.
- [ ] Outdated-translation tracking. The demo has one deliberately outdated
      French page (14b).
- [ ] A language switch in `playground-drupal` (moved from chunk 06).
- [ ] Skill: new `blokkli-setup-translations`: content translation for
      paragraphs and hosts (which fields are translatable, which aren't), DeepL,
      outdated-translation tracking.

## Acceptance criteria

- A page can be translated into DE and FR in the editor, with and without DeepL.
- An outdated translation is marked as such.
- The skill exists.

## Notes

- **Without a DeepL key** (the default locally and in CI), the editor must still
  work: check what the translation feature shows then.
