---
date: '2026-08-03'
---

### New Features

#### Edit suggestions before applying

Text suggestions from the AI assistant and automatic translations can now be
revised manually before applying them. The "Edit" button is available in the
toolbar and directly on the highlighted change (keyboard shortcut E). The text
opens in the familiar editor; the saved version replaces the original
suggestion. If individual sections of a suggestion have already been accepted or
rejected, that state is carried over into the editor. The AI assistant takes
manual revisions into account for further suggestions.

#### Reworked "Translate texts" dialog

The former "Automatic translation" dialog is now called "Translate texts" and
has grown into a full workspace for translations:

- Every translation can be edited directly in the table — both automatically
  translated suggestions and fully manual translations, without any translation
  request at all. Edited entries are marked as "Manually edited" and can be
  reset to the original suggestion with a single click.
- The selection in the table now only determines which fields get translated
  automatically. Applying covers all pending changes — unwanted suggestions can
  be discarded individually and restored if needed.
- When the dialog opens, only fields with a missing or outdated translation are
  preselected. The checkbox in the table header still selects all fields.
- The button for automatic translation now sits directly next to the table; the
  "Apply" button only becomes active once there are actual changes to apply.

### Fixes

- When reviewing suggestions, texts that cannot be edited directly on the page
  were neither highlighted nor shown in the preview. The corresponding block is
  now highlighted and the suggested change is displayed directly.
