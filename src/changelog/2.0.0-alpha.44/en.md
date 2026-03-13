---
date: "2026-03-12"
---

### New Features

#### Heading structure analyzer

A new built-in analyzer checks the heading hierarchy on your page (H1–H6) and flags issues such as multiple H1 headings or skipped heading levels.

#### Image alt text analyzer

A new accessibility analyzer highlights images that are missing alt text directly on the page.

#### Analyze tooltips on the artboard

When the analyze panel is active, hovering over a highlighted element now shows a tooltip with the issue title and readability score.

#### Readability score in editable overlay

While editing a rich text field, the readability score for the full text is now shown in the editing toolbar above the field.

#### Select parent block button

The block actions toolbar now has a button that lets you quickly select the enclosing parent block.

#### Move block button

A drag handle button in the actions toolbar lets you start moving blocks directly from the toolbar.

#### Improved search when adding blocks

The block selector now finds the right block type even with typos or partial terms. The search field is also focused automatically when the selector opens.

### Improvements

- The "Keep results visible" toggle in the analyze panel now shows a description explaining that results stay highlighted even after the panel is closed.

### Fixes

- Fixed the edit indicator not rendering after entering edit mode.
- Fixed the sticky block actions toolbar sometimes jumping to the wrong position.
- Fixed a visual glitch in the selection when the page was selected and the context menu was opened.
- Fixed block options changes not being submitted when a dialog was opened.
- Fixed the language switcher being shown even when only one language is available.
- Fixed readability scores being calculated incorrectly for certain text fields.
- Improved the readability analysis for German texts.
