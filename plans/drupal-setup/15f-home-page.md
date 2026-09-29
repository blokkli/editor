# 15f: The home page

- **Status:** in progress
- **Milestone:** M1 Local dev site
- **Depends on:** 15c, 15d

## Goal

The home page as visitors land on it: a hero with the search, what's on today,
the frequently searched links, then the editors' blocks (news, a call to action,
events, official publications). Its design is decided on a mock first, without
Drupal.

Until now the home page was an editorial page with placeholder blocks (15c), and
the home mockup's parts without a paragraph type were left to 14b (15b's "Left
for later").

## Decisions (the user, 2026-09-29)

1. **The site is finished before the sandbox and deployment chunks (08–12).**
2. **The home page is its own Nuxt page component,** not `Node/Editorial`. Above
   the node's blocks, it renders:
   - a hero of its own, from the node's title, lead and hero image
   - the search field, hardcoded
   - the "Today" row, hardcoded (later a fragment, see the notes)
3. **"Frequently searched"** is part of the site config page: a paragraphs field
   with up to 8 paragraphs.
4. **News, events and official publications** are one new paragraph type, the
   automatic teaser list. Its optional title overrides the default title;
   blökkli options pick what it lists.
5. **The politics box** is a new paragraph type.
6. **Mock first:** a Nuxt page without Drupal, before any change in Drupal. The
   canvas's mockup is a direction, not a spec: where authoring gets simpler, the
   design follows. The politics box, for example, has a single call to action
   instead of three links: rarely does a box have exactly three.

## Tasks

### The mock

- [x] `/<lang>/design-system/home-draft`, next to 15a's mockups, with German
      copy. Each part as it will be built:
  - the hero: title, lead and the image beside them, on the band
  - "Today": three facts
  - "Frequently searched": 8 links
  - three automatic lists: news as cards, events and publications as lists, each
    with its title and a link to all of them
  - the call to action: title, text and one button
- [x] Iterate on it with the user: more space between the sections, and the
      tagline back on the politics box. Accepted for building (2026-09-29).

### Then Drupal and Nuxt

- [x] The front page's own page component.
- [x] The site config page's field for the frequently searched links.
- [x] The automatic teaser list; it replaces the fragments `latest_news` and
      `upcoming_events`.
- [x] The call to action.
- [x] The official publication.
- [x] The home page's content in `drupal/content`, in EN, DE and FR.
- [x] Plans: 14a's block table, 14b's home page, 15d's open question on the
      editorial mockup, 13d's fragments.
- [ ] The user reviews the home page. Then the draft mock goes.

## Decisions on the structure (the user, 2026-09-29)

- **Official publications** are a content type: title, lead, a type (building
  application, traffic, regulation, other), the publication period (date range),
  and blocks for the rest.
- **The link to all of them** above a list is fixed per source, but leads to `#`
  for now: the overview pages aren't designed yet.
- **The call to action** has a paragraphs field of up to 4 links: one link is a
  button, several are a link list, as in the canvas's mockup.
- **"Today"** has fixed values for now. Computing them is a todo.
- **Events next to publications:** a columns paragraph (Claude's default).

## Acceptance criteria

- The mock renders at 390 to 1440 px without horizontal scrolling.
- The home page in Drupal matches the accepted mock, in EN, DE and FR.
- Editors can edit the frequently searched links, the automatic lists and the
  call to action in blökkli.
- `bun run verify` passes, and `drush config:status` is clean.

## Notes

### The mock (2026-09-29)

What it drops from the canvas's mockup:

- the hero image's caption: a media image only has its credit
- the news categories: news have none, so the teaser's meta is the date
- the politics box's three links: a tagline, a title, a text and one button (the
  tagline came back after the user's review)
- the first event's highlighted date: every date looks the same, as in
  `NodeTeaser`

More space between the sections from lg (`gap-24` instead of `gap-section`),
after the user's review.

The news cards and the list rows use `NodeTeaser`'s markup, which the automatic
lists will reuse.

### As built (2026-09-29)

**Drupal** (a script in the ignored `tmp/15f-config.php`, then exported):

- **`publication`:** a copy of `news` without the hero image, plus
  `field_publication_type` (`list_string`) and `field_period` (`daterange`, date
  only), both required and untranslatable. Pathauto: `/publications`,
  `/publikationen`, `/publications`. Enabled for blökkli, in the content search,
  and with news's node permissions for the three editor roles.
- **`teaser_list`:** only `field_title` (optional, translatable). Allowed on
  editorial pages, in sections and in columns.
- **`call_to_action`:** `field_tagline` (new), `field_title` (required, with a
  default: F7), `field_lead` (label "Text") and `field_links` (new, 4 links).
  Out of the library, as a container (F12). Allowed on editorial pages.
- **`site.field_quick_links`:** a new storage with a cardinality of 8, only
  links.
- Editorial pages no longer allow `blokkli_fragment`.

**Nuxt:**

- **`pages/[lang]/index.vue`** runs the route query for `/<lang>` and renders
  `Node/Editorial` with its `header` slot: `HomeHero` (title, lead, search, and
  the hero image unless the header option is "no image"), `HomeToday` and
  `QuickLinks`. Two components can't define the provider for `node`/`editorial`
  (the generated `const p_<hash>` would collide), hence the slot. `frontPage`
  gives the blocks the sections' spacing.
- **The front page's alias** (`/en/how-can-we-help`, e.g. from Drupal's "View"
  tab) redirects to `/<lang>` in `[...slug].vue`, with the query, so editing and
  previewing happen on the front page component. The route query selects the
  entity's `id`: the front page is node 1.
- **`Paragraph/TeaserList`:** one query, `teaserList`, whose filter and sort are
  variables built per source. Today is compared as a date (`Y-m-d`), so an event
  or a period that ends today still counts. The title is editable in place;
  while editing, an empty one shows the default as its placeholder. Cards or a
  list: see "Cards or a list" below (the display option went).
- **`Paragraph/CallToAction`:** the layout depends on the number of links. While
  editing, the `links` prop isn't updated (the Drupal module sends each nested
  field as its own mutated field), so the box counts its links with
  `useBlokkliHelper().queryBlocks()`, given its own item from `siblings`.
- **`Paragraph/Link/InList.vue`** also renders for
  `parentBundle: 'call_to_action'`, as a button when it's the only link
  (`siblings`). The link's style option is hidden in link lists and calls to
  action.
- **`Paragraph/Link/QuickLink.vue`** (`fieldListType: 'quick_links'`) and
  `QuickLinks/Item` render the links on the config page, where `ConfigPage/Site`
  shows the field below the header while editing. The home page renders them
  without blökkli, through `plainLinks()` (shared with the service links of the
  menu panel).
- **`Node/Publication`** and `NodeTeaser`'s row with a document icon;
  `usePublicationType()` for the type's label.

**Content:** the home page's blocks (news cards, the call to action for the
assembly, events and publications in columns), the news page's lists, 8 quick
links, 3 publications, 2 more news items and events. The home page's two teasers
moved to "Living here".

### Verification (2026-09-29)

- `ddev bake` and `ddev bake --source=de`, `drush config:status` clean after
  each. `bun run verify`: all 10 gates.
- **Browser:** the home page in EN, DE and FR at 390, 1024 and 1440 px, without
  horizontal scrolling or console errors. The alias redirects to `/en` with its
  query. A publication's page shows its type and period.
- **Editor, as admin:**
  - the allowed types on the home page include both new ones and no fragments
  - the title is editable, the hero image droppable; the header option "no
    image" removes the image
  - a second link in the call to action turns the button into a list, while
    editing; `field_links` has a cardinality of 4 in the editor
  - a new teaser list starts with news cards and switches to publications
  - the site config page shows the 8 quick links (cardinality 8)
- **As Jonas (restricted editor):** both new types are available, fragments
  aren't.

### "Today" and the quick links as fragments (the user, 2026-09-29)

Both became blökkli fragments, which only the home page allows: they're blocks
editors can move or remove there, and nowhere else.

- **`Paragraph/BlokkliFragment/Today`** (`today`) holds what `HomeToday` did,
  with the same fixed texts.
- **`Paragraph/BlokkliFragment/QuickLinks`** (`quick_links`) queries the site
  config page's links itself (`quickLinks`) and renders `QuickLinks`. While
  editing, without links, it says to add them on the config page.
- **Only on the front page:** `Node/Editorial` passes both to
  `allowed-fragments` when `frontPage` is set, and none otherwise. Editorial
  pages allow `blokkli_fragment` again for that.
- **The home page's header** is only `HomeHero` now; the seed puts both
  fragments first in its blocks.
- **Checked:** the home page looks as before in EN, DE and FR at 390 and 1440
  px. In the editor, only the home page's field allows the two fragments (not
  the news page), also for Jonas. `bun run verify` and a clean `config:status`
  after `ddev bake`.

### Cards or a list, by placement (the user, 2026-09-29)

The automatic list has no display option any more: its placement decides.

- **Cards** only at full width: directly on an editorial page (no `parentType`,
  and the provider's bundle is `editorial`).
- **A list** everywhere else: in columns, in a section, on a detail page. And
  always for publications, which have no image.
- **Detail pages** allow the list in their main field now. Building permits has
  one for the current publications.
- **Checked:** on the home page the news are cards and the events and
  publications in columns a list; on the news page both lists are cards; on
  building permits the publications are a list. `bun run verify`, and a clean
  `config:status` after `ddev bake`.

### Left for later

- **"Today"** has fixed texts, which go stale: compute them (the town hall's
  hours per weekday, the collection day, the next assembly).
- **The links to all news, events and publications** lead to `#` until the
  overview pages are designed.
- **The search** on the home page does nothing yet, like the search page.
