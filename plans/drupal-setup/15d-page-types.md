# 15d: Page types

- **Status:** in progress
- **Milestone:** M1 Local dev site
- **Depends on:** 15b

## Goal

Two page types, each with its own role and layout:

- **The detail page** (`page`): the information pages, the last page in its
  branch of the menu.
  - It always uses the sidebar layout and has no hero image.
  - Its responsible office feeds the header's "Responsible" line and a contact
    fragment in the sidebar.
- **The editorial page** (new): the home page, overview pages and landing pages
  (e.g. the lakeside pool).
  - It has a hero image and a free layout on the 12-column grid, and no sidebar.

The hero image is redesigned with it. In 15b it's "stuffed" into the header's
band.

Unlike 15a and 15b, this chunk changes the Drupal content model.

## Decisions (the user, 2026-09-27)

1. **The sidebar layout is only for detail pages.** It tells editors and
   visitors that the page is the last in its branch. It's a convention: nothing
   stops an editor from nesting pages under a detail page (15c may).
2. **Detail pages have no hero image.** Hero images are for editorial pages,
   news, events and offices.
3. **A detail page references its responsible office** (`field_office`).
   - The office's contact is a fragment in the sidebar.
   - New detail pages get it by default.
   - Editors can add blocks before, after or in between, or remove it.
   - It shows that custom ordering is possible, without "gluing" a contact
     paragraph together on every page.
4. **Overview pages are editorial pages**, not a type of their own.
   - They show their sub-pages from the menu at the top automatically.
   - A host option hides the list.
   - Both need the menus, so they're part of 15c.
5. **Events and offices are a chunk of their own** (15e): their own design, with
   the event's date, time and place highlighted. Until then they keep 15b's
   sidebar.

## Tasks

### Drupal

- [x] **`page`:**
  - [x] It's labelled "Detail page" (DE "Detailseite", FR "Page de détail"). The
        machine name stays.
  - [x] It gets a new `field_office`: a node reference to offices, optional and
        untranslatable, in the form, and exposed in the GraphQL server.
  - [x] `field_hero_image` is removed.
  - [x] `field_host_options` is removed; it moves to the editorial page.
  - [x] `field_aside` also allows `blokkli_fragment`.
- [x] **The new node type `editorial`:**
  - [x] Labelled "Editorial page" (DE "Redaktionelle Seite", FR "Page
        éditoriale").
  - [x] Fields: title, lead, hero image, host options, and `field_paragraphs`
        with the page's types and fragments.
  - [x] Wired up like `page`: translation settings, `enabled_types`, the GraphQL
        bundle, the teaser's target bundles, and a `node__editorial` entity
        mapping.
- [x] **A default value** for `field_aside`: a new detail page gets the contact
      fragment. Not a `node_presave` hook: the hook runs after the fields'
      `preSave()`, so the new paragraph was never saved.
- [x] **The schema loop:** `ddev drush cex -y`, `bun run drupal:schema`,
      `bun run dev:prepare` (revert the playground's `options-schema.json`).

### Nuxt

- [x] **`Node/Page`:**
  - [x] It always uses the sidebar layout.
  - [x] The header has no image.
  - [x] The meta line reads "Responsible: <the office, linked> · Updated on …",
        as in the detail mockup.
- [x] **The fragment `office_contact`** ("Contact"):
  - [x] It renders the page's office like 15b's sidebar contact.
  - [x] **The data:** a fragment gets no props, so the page provides its office.
        The route query reloads the office after it's changed in the form.
  - [x] Without an office: a placeholder while editing, nothing otherwise.
- [x] **The sidebar panel** is hidden when nothing in it is visible, but the
      layout stays.
- [x] **`Host/Layout`:**
  - [x] A prop switches the sidebar layout, instead of `:has(.has-aside)` and
        the aside field's `non-empty-class`.
  - [x] The rules for a title on the image with a sidebar are removed: no host
        has both any more.
  - [x] Events and offices pass the prop until 15e.
- [x] **The new `Node/Editorial`:**
  - [x] the header variants as a host option
  - [x] the route query and `pbMutatedEntity`
- [x] **The hero image:**
  - [ ] It moves out of the band, iterated on in the browser with the user.
  - [x] **The starting point:** the image after the band, 12 columns wide, with
        the band reaching halfway down it. The title on the image stays a
        variant.
  - [x] News uses the new hero too.
- [x] **Texts:** EN, DE and FR in `drupal/content/texts.csv`: the "Responsible"
      line, the fragment's heading and placeholder.
- [x] **The design system page:** the page types and their layouts.

### Plans

- [x] 14a: the content model's changes to `page`, and the new `editorial` type.
- [x] 13d: the service page template's contact is now the sidebar fragment (the
      content comes with 05/14b).

## Acceptance criteria

- **A new detail page** has the contact fragment in its sidebar. Choosing an
  office in the form fills it and the "Responsible" line.
- **Editing the sidebar:** blocks can be added before, after and in between. The
  fragment can be removed and added again.
- **A detail page without an office or a sidebar** keeps the sidebar layout,
  without an empty panel.
- **An editorial page** renders with each header variant, in EN, DE and FR, at
  390 to 1440 px, without horizontal scrolling. News use the new hero.
- `bun run verify` passes, and `drush config:status` is clean.

## As built

### Drupal

- **The changes** were made through Drupal's API (a script in the ignored
  `tmp/`) and exported: the editorial type, its fields and displays are copies
  of the page's, without `field_aside`.
- **`field_office`** is a new node field storage: an `options_select` in the
  form, below the lead. Translation forms hide it, like every untranslatable
  field.
- **The default sidebar:** `PageDefaults::sidebar()` in `blokkli_playground` is
  `field_aside`'s default value callback. The reference field saves the new
  paragraph with the page. Pages created with a sidebar keep theirs.
- **The deleted fields' data** was purged (`field_purge_batch()`). The pages'
  hero images and header options are gone; they were test content.

### Nuxt

- **`Host/Layout`:**
  - `sidebar` switches the sidebar layout: 12 columns in the wide container,
    without the outer tracks that 15b needed for a title on an image.
  - The panel is hidden when no block in it is visible (e.g. the contact
    fragment without an office), unless `isEditing`: then it stays a drop zone.
- **`Host/Header`:**
  - The band is on the text.
  - `image` puts the image after the band in `container-wide`, 3:2 and 5:2 from
    lg, over a second band that ends halfway down it.
  - `overlay` is unchanged.
- **`Node/Page`:**
  - The header is `plain`; the meta has "Responsible:" and the office's name,
    linked.
  - The sidebar field allows the `office_contact` fragment only.
- **`Office/Contact`** is the sidebar contact, shared by the contact block and
  the fragment `Paragraph/BlokkliFragment/OfficeContact`.
- **`usePageOffice`:** `providePageOffice()` and `usePageOffice()` carry the
  page's office to the fragment.
- **`Node/Editorial`:** the header option moved here from the page, unchanged.
- **The routes and teasers** know `NodeEditorial`; `pbMutatedEntity` has its
  hero.
- **A fix from before:** `OfficeDetails` doesn't inherit attributes. Its callers
  spread whole offices into it, so the `<dl>` got `title` (a tooltip) and `url`
  attributes.

## Verification (2026-09-27)

- **Gates:**
  - `bun run verify` passes in the container (all 8 gates).
  - `drush config:status` is clean.
  - The PHP class passes `php -l`. The project has no phpcs or phpstan yet
    (chunk 07 deferred them to 13g).
- **Test content:**
  - detail page 14 "Building permits", with the Town hall as its office
  - editorial page 15 "Living here"
  - Both are in EN, DE and FR. Page 5 got the Town hall as its office.
- **Browser, logged in:**
  - **Pages:** pages 1, 5, 12 and 14; editorial page 15; news 3; event 4;
    office 2.
  - **Widths:** 390, 768, 1024 and 1440 px.
  - **Languages:** pages 14 and 15 in EN, DE and FR.
  - **Checks:**
    - no horizontal overflow and no console errors
    - page 14 got the fragment from the default value
    - pages 1 and 12 (without an office or a sidebar) keep the layout, without a
      panel
- **The editor:**
  - **Page 14:** a contact block was added before the fragment and a downloads
    block after it. The fragment was removed and added again at the end. Then
    all changes were reverted.
  - **Page 1:** the empty sidebar is a drop zone. The fragment added there shows
    the placeholder. Reverted.
  - **Editorial page 15:** the header option switches between the three
    variants. Reverted.
- **Drupal's forms:**
  - The page's form has "Responsible office" with its description.
  - "Add content" lists "Detailseite" and "Redaktionelle Seite" in DE.
  - The editorial form has the hero image.

## Open

- **The canvas's editorial mockup** isn't in the repository yet: 15a built the
  detail and home mockups. It decides whether the editorial page needs more than
  the blocks' width options.

## Left for later

- **15c:**
  - the menus and the breadcrumb
  - the detail page's eyebrow (its parent in the menu)
  - the sub-pages at the top of editorial pages, with a host option to hide them
  - the home page as an editorial page, for the logo's link
- **15e:** events and offices without the sidebar. The office gets a hero image.
  Done (2026-09-27): their facts follow the header.
- **13g:** the search providers cover editorial pages.
- **13i:** the table of contents fragment joins the sidebar's default, before
  the contact (the detail mockup's order).
