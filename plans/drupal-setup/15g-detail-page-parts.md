# 15g: The detail page's missing parts

- **Status:** done
- **Milestone:** M1 Local dev site
- **Depends on:** 15d

## Goal

The parts of the detail mockup (`/<lang>/design-system/detail`) that had no
paragraph type yet (15a's decision 7, 15b's "Left for later"): the info boxes,
the steps ("Ablauf") and the related topics at the end of the page.

## Decisions (the user, 2026-09-29)

1. **The info box is the text paragraph,** not a paragraph type of its own: a
   blökkli option puts the text in a box.
2. **The steps** are a `steps` paragraph holding `step` paragraphs, as the link
   list holds links. Every number looks the same: the mockup's lighter last
   number meant nothing (the mockup follows now).
3. **The related topics** are a paragraphs field on the detail page, with up to
   three teasers.

## As built

**Drupal** (a script in the ignored `tmp/15g-config.php`, then exported):

- **`steps`** ("Steps" / "Ablauf" / "Étapes"): `field_paragraphs`, only `step`.
  Out of the library, as a container (F12). Allowed where the link list is,
  except the sidebar: every host's main field, sections and accordions. Not in
  columns, which keeps the model at 4 levels.
- **`step`**: `field_title` (required, with a default: F7) and `field_text`
  (optional, `basic_html`). Only in the steps, out of the library.
- **`page.field_related`** ("Related topics" / "Verwandte Themen" / "Thèmes
  associés"): a new storage with a cardinality of 3, only teasers,
  untranslatable like the other paragraphs fields.
- Permissions as for the other paragraph types.

**Nuxt:**

- **`Paragraph/Text`:** the option `box` (none, blue, green, yellow, red, the
  banner's swatches) renders the text in `Callout`. Only in the page's blocks
  (field list type `default`), not in the footer.
- **`Paragraph/Steps`** renders an `<ol>`, **`Paragraph/Step`** a numbered row
  (`index` from `defineBlokkli`), so the numbers follow while editing. The
  heading above is a title paragraph, which the table of contents picks up.
  `paragraphStep` is also in the `paragraph` union: the editor loads each
  field's blocks with it, so without it a step had no title or text while
  editing (the user, 2026-09-29).
- **`Node/Page`** ends its main column with the related topics while there are
  any, and always while editing (field list type `related`).
- **`Paragraph/Teaser/Related.vue`** (`renderFor` the field list type `related`)
  renders `NodeTeaser`'s new display `link`: the title with an arrow and the
  lead, clamped to two lines. The teaser's display option is hidden there.
  `Teaser/target.ts` holds what both teaser components need: the linked node and
  the URL.

**Content:** building permits has an info box, the steps under "Procedure", a
warning box and three related topics (two URLs with their own title and lead,
and the administration page with its own).

## Unified components (the user, 2026-09-29)

After the first build, the user pointed out three inconsistencies:

- **Link list rows:** a document had its icon before the label, a link its arrow
  after it. Now every row ends with its icon (a document's download icon after
  its meta text, a link's arrow), so the labels line up.
- **The squares before a row** had two sizes: the step's number 44 px, the
  event's date and the publication's icon 60 px. The new `Tile` gives them one
  size (60 px) and three tones (primary, light, surface).
- **Arrows as text:** the links to all news, events and publications ended with
  a "→" character. The new `ArrowLink` ends with the arrow icon, as everywhere
  else. The related topics use the same weight and arrow size.

The mockups and the design system page use both components too; its type scale
keeps "→" for its size ranges (mobile → desktop).

## Verification (2026-09-29)

- `ddev bake`, `drush config:status` clean. `bun run verify`: all 10 gates.
- **Browser:** building permits in EN, DE and FR at 390 and 1440 px, without
  horizontal scrolling or console errors: the steps numbered 1 to 5, both boxes,
  the three related topics with their heading, "Procedure" in the table of
  contents.
- **Editor, as admin:** steps only allow steps, the main field allows the steps
  and the sidebar doesn't; `field_related` allows only teasers, 3 at most, and
  renders them through `Related.vue`. A duplicated step renumbers the list; the
  info box's option changes its colour in place.
