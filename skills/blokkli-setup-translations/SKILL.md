---
name: blokkli-setup-translations
description: >-
  Set up translation in a blökkli 2.x + Drupal project: content translation for
  hosts and paragraphs (which fields translate and which never do), adding
  translations from the editor, machine translation with DeepL
  (paragraphs_blokkli_deepl), outdated-translation tracking, option and label
  texts in every language, and what the frontend must do for the editor's
  language switcher. Use when editors should translate pages in the editor, see
  outdated translations or translate with DeepL; or when the language switcher
  greys out a language, a translation changes the source's dates or links,
  "Translate texts" fails, outdated translations aren't marked, or option labels
  stay in English.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal module and paragraphs_blokkli 2.x,
  a multilingual Drupal site (language, content_translation), plus access to the
  Drupal backend (composer, drush, config export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/drupal/configuration#translations
---

# Translations

In the editor:

- **The language switcher** in the toolbar shows every language, with "Source
  language", "Translation" or "Add translation" as its tooltip. A greyed-out
  language has no translation yet; clicking it opens Drupal's form to add one.
- **In a translation,** a banner says "You are currently editing the …
  translation.", with "Translate texts...", "Import/export..." and "Edit source
  language instead". Only texts can change; structure and options can't.
- **On selected paragraphs:** "Edit translation" (Drupal's form in that
  language), "Auto-translate" and "Mark as up-to-date".
- **Outdated translations** are outlined, with the tooltip "Outdated
  translation", and a banner counts them: "1 block has an outdated
  translation.", with "Mark all as up-to-date".
- **"Translate texts"** is a dialog with every text of the page, the filters
  "Only outdated translations" and "Only missing translations", "Auto-translate
  … fields", "Apply" and "Mark as up-to-date".
- **An editable field** has a "Translate" button while translating.

The ways to translate:

| How                                 | Who does it                                                                    | Needs                                  |
| ----------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| Inline, in the page                 | `paragraphs_blokkli`                                                           | content translation                    |
| "Edit translation", Drupal forms    | Drupal                                                                         | content translation, the form displays |
| "Translate texts", "Auto-translate" | `paragraphs_blokkli_deepl`                                                     | a DeepL key                            |
| "Import/export..." (CSV, PO)        | `paragraphs_blokkli`                                                           | nothing more                           |
| The agent                           | `auto_translate_paragraphs` uses DeepL; `delegate_text_rewrite` uses the model | the agent (and DeepL for the first)    |

The docs:
[translations and DeepL](https://docs.blokk.li/modules/drupal/configuration#translations),
[option labels in several languages](https://docs.blokk.li/define-blokkli/options#labels-in-several-languages),
[the editor's own UI languages](https://docs.blokk.li/editor/translations). This
skill is the procedure and the traps.

## Before you start

Decide, or ask:

- **The languages and the source language.** Content is written in the source
  language (usually the site's default) and translated from it.
- **Which host and paragraph types are translated.** Paragraph types without
  text (a gallery, a teaser, a contact reference) usually aren't.
- **DeepL:** whether the project has an account and an API key. Without one,
  editors translate by hand or import.

## 1. Content translation

Enable `language` and `content_translation`, add the languages, then set up each
bundle (`language.content_settings.<entity type>.<bundle>`):

- **Hosts** (node types, config pages, library items): translation on,
  `untranslatable_fields_hide: true`.
- **Paragraph types with text:** translation on. Paragraph types without text:
  off.
- **Paragraphs fields,** on hosts and nested: the **storage** is translatable,
  the **field** isn't (`translatable: false`). The translations share one list;
  blökkli translates the paragraphs, not the list.
- **What translates:** text an editor types (titles, texts, captions, a lead, an
  address).
- **What never does:** dates, links, references, media fields, numbers. Set
  `translatable: false` explicitly; Drupal's API creates fields as translatable.
  blökkli options are shared across languages anyway.
- **`created`** is a translatable base field. If the site shows it (e.g. as a
  news date), override it per bundle, or Drupal's "add translation" form gives
  each new translation the date it was added:

  ```yaml
  # core.base_field_override.node.news.created.yml
  translatable: false
  ```

  Create it with
  `$field_manager->getFieldDefinitions('node', 'news')['created']->getConfig('news')->setTranslatable(FALSE)->save()`,
  then `drush cex`. Nothing else changes: the storage stays translatable.

- **The exceptions to "dates never":**
  - scheduler's `publish_on` and `unpublish_on` must have the same setting as
    `status`, which is per translation (scheduler checks this). With
    `publish_touch`, a scheduled publish of one translation sets the shared
    `created` of all of them.
  - `changed` is Drupal's per-translation metadata; leave it.
- **`untranslatable_fields_hide`** only affects Drupal's host forms. blökkli's
  paragraph form ("Edit translation") shows shared fields in a translation
  without an "(all languages)" hint, and changing one there changes every
  language. Another reason to keep links and media out of translations.
- **Config pages** need a translation per language. Without one, the frontend
  shows, and blökkli edits, the default translation.

Export the config (`drush cex`).

## 2. New translations

- **A host translation** is added with the switcher: a greyed-out language opens
  Drupal's "add translation" form in the editor. It copies the source's values;
  after saving, the editor switches to the new translation.
- **Paragraph translations** are created on the first change in that language,
  as copies of the source. Until then the translation shows the source's text.
- The switcher needs Drupal to return every language in the edit state's
  translations, each with a URL and an edit URL (`paragraphs_blokkli_graphql`
  does).

## 3. DeepL

- `composer require deeplcom/deepl-php`, then enable `paragraphs_blokkli_deepl`
  and its GraphQL extension `paragraphs_blokkli_deepl`. No TMGMT.
- **The key:** from the environment, with a placeholder in config. In
  `settings.php`:

  ```php
  $config['paragraphs_blokkli_deepl.settings']['api_key'] = getenv('DEEPL_AUTH_KEY') ?: '';
  ```

  Then
  `drush config:set paragraphs_blokkli_deepl.settings api_key overridden-at-runtime`.
  The settings form (`/admin/config/content/blokkli/deepl`) shows and stores
  what is in config, not the key from `settings.php`: with the placeholder it
  shows the language mapping, and `drush cex` never exports the key.
  - Never type the key into the form: it would be stored and exported.
  - Keep the `?: ''`. An override that is only set when the variable exists
    would send the placeholder to DeepL.

- **`language_mapping`** in `paragraphs_blokkli_deepl.settings`: the DeepL code
  per Drupal language (`en: EN-GB`, `de: DE`, `fr: FR`), optionally with a style
  rule ID. Set it in the settings form, which lists DeepL's languages, or in the
  config file; then `drush cex`.
- **Glossaries:** every multilingual glossary of the DeepL account is used for
  its language pair; there's nothing to configure.
- **Without a key** the editor still offers machine translation: the module's
  GraphQL extension is enabled, and the editor can't tell whether a key is set.
  "Translate texts" then shows "DeepL API key is not configured."; that's a
  misconfigured site. "Auto-translate" and the field's "Translate" button fail
  without a message.

## 4. Outdated translations

- They need content translation on the paragraph types: the flag is core's
  `content_translation_outdated`, per paragraph translation.
- **What marks them:** changing a paragraph's text in the source language
  (inline, bulk or import), or saving its form in the source language, whichever
  field changed. Only existing translations are marked.
- **What doesn't:** options, drops and the media library, and the host's own
  fields (title, lead).
- **What clears them:** "Mark as up-to-date", "Mark all as up-to-date", or
  "Apply" in "Translate texts" or an import with "Mark as up-to-date" on.
  "Auto-translate" and the agent's translations don't clear them.
- **When they're saved:** on publish, like every other change.
- Drupal's translation overview doesn't show them; only the editor does.

## 5. Labels in every language

The editor's interface follows the page's language (German on a German page),
among the languages blökkli ships. Labels from the project follow it too, if
they're translated:

- **Options:** `label` and `description` take one text per language
  ([docs](https://docs.blokk.li/define-blokkli/options#labels-in-several-languages)):

  ```typescript
  options: {
    display: {
      type: 'radios',
      label: { en: 'Display', de: 'Darstellung', fr: 'Affichage' },
      default: 'full',
      options: {
        full: { label: { en: 'Full', de: 'Vollständig', fr: 'Complet' } },
        compact: { label: { en: 'Compact', de: 'Kompakt', fr: 'Compact' } },
      },
    },
  },
  ```

  A plain radio choice needs the `{ label }` object; a bare `{ en, de, fr }`
  isn't a valid choice. Choices with their own shape (colors, grids, icons)
  translate their `label`. Options can't be changed in a translation, so these
  labels show when editing a page in its source language (and in Drupal's
  paragraph form, through the options schema).

- **Fallbacks:** the interface language, then
  [`defaultLanguage`](https://docs.blokk.li/configuration#defaultlanguage)
  (default `en`), then the first text. `forceDefaultLanguage: true` keeps the
  interface and the labels in the default language on every page.
- **"Visible languages"** (`bkVisibleLanguages`, see the
  `blokkli-add-paragraph-type` skill) is English in every language. Redefine it
  in `nuxt.config.ts` with your texts:

  ```typescript
  blokkli: {
    globalOptions: {
      bkVisibleLanguages: {
        type: 'checkboxes',
        label: { en: 'Visible languages', de: 'Sichtbare Sprachen', fr: 'Langues visibles' },
        description: {
          en: 'Only show on specific languages.',
          de: 'Nur in bestimmten Sprachen anzeigen.',
          fr: 'Afficher uniquement dans certaines langues.',
        },
        options: {},
        default: [],
      },
    },
  },
  ```

- **Paragraph type, bundle and field labels** come from Drupal, in the request's
  language. Translate them as config translations (the `config_translation` UI,
  or `languageManager()->getLanguageConfigOverride($langcode, $name)` and
  `drush cex`, which writes `config/sync/language/<langcode>/…`).
- **Fragment labels** (`defineBlokkliFragment`) are plain strings: English in
  every language.

## 6. The frontend

- **Render the translation of the URL's language,** and pass that translation's
  `blokkliProps` to `BlokkliProvider`: its `language` tells the editor which
  translation it edits. A per-language GraphQL endpoint (`/de/graphql`) or
  language negotiation does this. A URL in a language without a translation
  shows the source, and the editor then edits the source.
- **The editor's switcher** navigates to the translation's URL and keeps the
  query (`?blokkliEditing=…`). Routing must accept it on every language's paths.
- **A site language switch** should hide while editing (the editor has its own)
  and while previewing (`?blokkliPreview=…`): its links would leave the editor
  or the preview.
- The site's own language switch and UI strings aren't blökkli's concern.

## 7. Publishing translations

- One publish saves every language: one revision covers them all.
- **"Publish if unpublished"** publishes the host's default translation,
  whichever language the editor is in. To publish a translation that is
  unpublished while the source is published, use Drupal's form.

## 8. Permissions

Tell the developer who needs which; don't assign them:

- **Hosts:** `translate <bundle> node` (and the equivalent for other entity
  types), `create content translations` and `update content translations`. The
  switcher's "add translation" form needs them.
- **Config pages:** `translate translatable_config_pages`.
- **Paragraphs:** translating them is an edit of the edit state:
  `edit paragraphs blokkli edit state`, which "Edit translation" checks too.
- **DeepL** has no permission of its own: whoever can use blökkli can use it.

## 9. Check the result

1. **The schema** has the mutations `update_field_value`,
   `clear_outdated_translation` and `bulk_translate_field_values`, and, with
   DeepL, `paragraphsBlokkliRequestTranslation`.
2. **The Nuxt dev server's log** doesn't list `translations` among the disabled
   features.
3. **In the browser, as an editor** (not user 1):
   - the switcher lists every language, a missing one greyed out
   - clicking it opens the "add translation" form; after saving, the editor is
     in the new translation, and dates and links are unchanged
   - a changed text in the source language, published: the translation shows
     "Outdated translation", and "Mark as up-to-date" clears it
   - "Translate texts" translates with DeepL, or shows the key error without one
   - option labels in the page's language, on a page edited in its source
     language

## Symptoms and causes

| Symptom                                                       | Cause                                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The switcher doesn't appear                                   | The host type isn't translatable, or the site has one language                                                            |
| Clicking a greyed-out language does nothing                   | The edit state's translations lack that language, or its edit URL                                                         |
| A new translation has today's date                            | `created` is translatable (section 1)                                                                                     |
| A link changed in one language, the others kept the old one   | The link field is translatable                                                                                            |
| Changing a field in "Edit translation" changed every language | The field is untranslatable; blökkli's form doesn't say so                                                                |
| Nested paragraphs differ between languages                    | A paragraphs field is translatable                                                                                        |
| "DeepL API key is not configured."                            | No key in the environment (the `settings.php` override replaces what is stored in config)                                 |
| "Auto-translate" does nothing                                 | DeepL failed (e.g. no key); the error only shows in "Translate texts"                                                     |
| Outdated translations aren't marked                           | Content translation is off for the paragraph type, the change was an option or media, or the translation didn't exist yet |
| Option labels stay in English                                 | Plain string labels, or a plain radio choice given a bare map, or `forceDefaultLanguage`                                  |
| Paragraph type labels stay in English                         | No config translation for the paragraph type                                                                              |
| "Publish" leaves an unpublished translation unpublished       | "Publish if unpublished" acts on the default translation                                                                  |
| The editor edits the source on a translated URL               | The frontend passes the source's `blokkliProps`, or the translation doesn't exist                                         |
