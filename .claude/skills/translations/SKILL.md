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
bun run texts

# List missing translations for a language
bun run texts -- missing <language>

# Update specific translations
bun run texts -- update <language> key1="value1" key2="value2"
```

## Workflows

### Find missing translations for a language

1. Run `bun run texts -- missing <language>` to get the list of untranslated
   keys with their English source text
2. Present the missing keys to the user or proceed with translating them

### Add translations for missing keys

1. Run `bun run texts -- missing <language>` to identify which keys need
   translation
2. Translate the English source texts to the target language
3. Run
   `bun run texts -- update <language> key1="translation1" key2="translation2"`
   to write them
4. The command updates both the `.po` file and regenerates the `.json` file

### Add a new translatable string in code

1. Use `$t('keyName', 'English default text')` in Vue/TS source files
2. **Both arguments must be pure string literals** (no variables, concatenation,
   or template literals with expressions) — they are extracted by statically
   parsing the source code
3. Run `bun run texts` to sync — this adds the new key to all PO files and
   regenerates JSON
4. Then add translations using the update command above

### Full sync after code changes

Run `bun run texts` to re-extract all keys, add new ones to PO files, remove
stale ones, and regenerate all JSON files.

## Important Notes

- **Never edit JSON files directly** — always edit PO files or use the CLI
  commands
- The `update` command will error if a key doesn't exist in the PO file — run
  `bun run texts` first to sync new keys
- Translation entries have both a `source` (English text) and a `translation`
  (localized text)
- Keys with an empty `translation` are considered missing

## Translation Style Rules

Before translating any string into a target language, follow these rules. They
exist because past machine-style translations produced nonsense.

### Match the existing PO file's conventions

**Always grep `i18n/<lang>.po` for existing renderings of similar concepts
before inventing your own translation.** The project already has a voice and
terminology — match it.

- Reuse term choices already in the file (e.g. blökkli's `de.po` uses
  `Datenreihe` for chart "series", `Panel` for "panel", `Vorschau` for
  "artboard" — don't invent alternatives).
- Match the file's orthography. `de.po` uses **Swiss spelling**: no `ß`, use
  `ss` (`schliessen`, not `schließen`).
- Match the file's quotation style — `de.po` uses `«»` guillemets, not `„"`.

### Form of address

- **`de` and `gsw_CH`**: use formal **Sie** for direct instructions, or
  **impersonal third-person** for descriptions (e.g. setting descriptions:
  `Verwendet sanftes Scrollen…`, `Zeigt den Importdialog…`). **Never** use
  `du`-imperatives.

### UI element names — do NOT literal-translate

This is a common failure mode. English UI terms like **drawer, modal, tab,
panel, toast, chip, dropdown, sidebar, popover** name _abstract UI widgets_, not
their literal-domain meaning. Translating "drawer" as `Schublade` (kitchen
drawer) or "toast" as `Toast` (bread) is nonsense in a UI context.

**Rule:** for UI element names, default to the German loanword (`Drawer`,
`Panel`, `Dialog`, `Tab`, `Tooltip`) **or** reuse a more abstract term the
project already uses (e.g. blökkli uses `Panel` widely — prefer that). Never
emit a literal kitchen/clothing/food translation for a UI widget.

When unsure between two acceptable renderings of a UI term, ask before applying.
