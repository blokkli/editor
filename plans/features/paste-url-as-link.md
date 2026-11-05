# Paste a URL as a link paragraph

Pasting a URL creates a text paragraph with the URL, even where a link paragraph
would fit. It was F46 of the drupal-setup findings, found on 2026-09-28 by
reading the code, and moved here on 2026-10-29: it's a feature that neither the
editor's Drupal side nor `paragraphs_blokkli` has, not a bug.

## Today

- **The editor:** the clipboard feature finds a bare URL in pasted text and asks
  the adapter for a paragraph type with `{ type: 'link', url }`
  (`src/runtime/editor/features/clipboard/index.vue:1026-1040`, the event in
  `types.ts:125-128`). If the adapter answers with one, the URL is still added
  as a text item (`type: 'text'`): there is no link item yet.
- **The Drupal adapter:** `clipboardMapBundle`
  (`src/modules/drupal/runtime/adapter/index.ts:1697`) maps videos, plain text,
  images and files, not links. So the URL falls through to plain text.
- **`paragraphs_blokkli`:** no clipboard config names paragraph types for URLs,
  and no mutation creates a link paragraph from a URL.

## Idea

- **`paragraphs_blokkli`:** a clipboard config for URLs, as for files: the
  paragraph types with a link field that takes one. A mutation that adds such a
  paragraph and sets its link field to the URL.
- **The Drupal adapter:** map `{ type: 'link' }` to those types, and add the
  paragraph with the new mutation.
- **The editor:** a link item in the clipboard, so that the adapter gets the URL
  as a link and not as text.
- **To decide:**
  - The link's title: empty, the URL, or the page's title.
  - A link to a page of the site: an internal link (`entity:node/1`) instead of
    the URL.
