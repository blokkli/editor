---
date: '2026-04-07'
---

### New Features

#### Ignore analysis results

Individual analysis results (e.g. text readability) can now be ignored. Ignored
results are preserved even after publishing changes. They are displayed in the
analysis sidebar and can be restored from there.

#### Outdated translations

Blocks with outdated translations are highlighted in the editor and can be
navigated one by one via the translation banner, then marked as up-to-date. A
translation is automatically marked as outdated when a change is made in the
original language.

#### Automatic translation (DeepL)

Use the "Auto-translate..." button in the translation banner to automatically
translate all texts via DeepL. Individual text fields can also be translated
directly using the "Translate" button on the field.

#### Import and export translations

Translations can be exported and imported as CSV or PO files. Filter by outdated
or missing translations, and preview all changes before importing.

#### Switch page

Use the new "Switch page" button to quickly jump to a different page without
leaving the editor. This feature is also accessible via `Ctrl + P` (Windows) or
`Cmd + P` (macOS).

#### Related content

Selected blocks now show related content such as pages, images, or documents.
These can be edited directly from within the editor.

### Improvements

- Rich text fields can be expanded to fullscreen for more comfortable editing.
- Rich text fields now show a formatted preview while editing.
- Right-click the zoom display to select a zoom level directly.
- The display of analysis results has been redesigned and now shows a label
  describing the issue.
- Conversations with "Superblökkli" can be rated. The ratings are used to
  improve the agent.

### Fixes

- In the structure view in the sidebar, blocks could be moved freely, which
  could lead to invalid states. This is now validated.
- Closing a rich text field without making changes could sometimes register a
  change in the history. This can no longer happen.
