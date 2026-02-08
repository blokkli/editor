---
description:
  Manage blökkli translations - find missing translations, update PO files, and
  sync translation keys
user_invocable: true
---

# Translations Skill

Manage blökkli's internationalization files. Translations use gettext `.po`
files as source of truth, with generated JSON files for runtime use.

## System Overview

- **Source of truth**: `.po` files in `i18n/` (one per language)
- **Generated output**: JSON files in `src/runtime/editor/translations/` (never
  edit directly, HMR-enabled during dev)
- **Languages**: `de` (German), `fr` (French), `it` (Italian), `gsw_CH` (Swiss
  German)
- **Translation keys** are extracted from `$t()` calls in `src/**/*.{vue,ts}`
  and from `defineBlokkliFeature()` definitions

## Commands

```bash
# Sync: extract source texts and update all PO/JSON files
npm run texts

# List missing translations for a language
npm run texts -- missing <language>

# Update specific translations
npm run texts -- update <language> key1="value1" key2="value2"
```

## Workflows

### Find missing translations for a language

1. Run `npm run texts -- missing <language>` to get the list of untranslated
   keys with their English source text
2. Present the missing keys to the user or proceed with translating them

### Add translations for missing keys

1. Run `npm run texts -- missing <language>` to identify which keys need
   translation
2. Translate the English source texts to the target language
3. Run
   `npm run texts -- update <language> key1="translation1" key2="translation2"`
   to write them
4. The command updates both the `.po` file and regenerates the `.json` file

### Add a new translatable string in code

1. Use `$t('keyName', 'English default text')` in Vue/TS source files
2. **Both arguments must be pure string literals** (no variables, concatenation,
   or template literals with expressions) — they are extracted by statically
   parsing the source code
3. Run `npm run texts` to sync — this adds the new key to all PO files and
   regenerates JSON
4. Then add translations using the update command above

### Full sync after code changes

Run `npm run texts` to re-extract all keys, add new ones to PO files, remove
stale ones, and regenerate all JSON files.

## Important Notes

- **Never edit JSON files directly** — always edit PO files or use the CLI
  commands
- The `update` command will error if a key doesn't exist in the PO file — run
  `npm run texts` first to sync new keys
- Translation entries have both a `source` (English text) and a `translation`
  (localized text)
- Keys with an empty `translation` are considered missing
