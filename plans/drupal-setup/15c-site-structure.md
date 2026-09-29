# 15c: Site structure

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 15d

## Goal

The site gets a structure from Drupal's main menu:

- the header's navigation
- a breadcrumb
- the detail page's eyebrow (its parent)
- the sub-pages at the top of editorial pages
- readable URLs
- a home page for the logo's link

## Decisions

### The user (2026-09-27)

1. **As in the starterkit** (`blokkli_starterkit` 2.0.x):
   - The breadcrumb comes from Drupal: `menu_breadcrumb` over the main menu,
     through graphql_core_schema's `breadcrumb` extension on the route. It isn't
     derived in Nuxt.
   - **pathauto** makes the URLs.
2. **Overview pages are editorial pages** (15d). They list their sub-pages at
   the top automatically. A host option hides the list.

### Proposed, and confirmed by the user (2026-09-27)

3. **Modules:**
   - `pathauto`, `token`, `token_or` (for the `[a|b]` fallback in the
     starterkit's pattern) and `menu_breadcrumb`, at the starterkit's versions.
   - The starterkit's patches, if the current releases still need them:
     - `menu_breadcrumb`: the GraphQL cache context ("broken breadcrumb on
       second request") and PHP 8.5's boolean casts
     - `pathauto`: PHP 8.4+ null entity ids
   - Not `menu_item_extras`, `menu_position` or `link_attributes`: nothing here
     needs them yet.
4. **Menu links are translatable** (content translation on `menu_link_content`),
   so the menu, the breadcrumb and the aliases exist in DE and FR.
5. **The node form offers the main menu** for detail and editorial pages only.
   News, events and offices aren't in the menu.
6. **Aliases** (pathauto patterns):

   | Type                   | Pattern                                                                                                  |
   | ---------------------- | -------------------------------------------------------------------------------------------------------- |
   | detail, editorial page | `/[node:menu-link:parents:join-path]/[node:menu-link:title\|node:title]` (the starterkit's page pattern) |
   | news                   | `/news/…` (EN), `/aktuelles/…` (DE), `/actualites/…` (FR), then the title                                |
   | event                  | `/events/…`, `/veranstaltungen/…`, `/evenements/…`                                                       |
   | office                 | `/offices/…`, `/aemter/…`, `/services/…`                                                                 |
   - **News, events and offices** aren't in the menu. Their breadcrumb comes
     from Drupal's path-based fallback: an overview page whose alias is the
     prefix (e.g. `/de/aktuelles`) appears in it.
   - **Aliases must not start with nginx's Drupal paths** (`admin`, `media`,
     `user`, `system`, `token`, …). Otherwise nginx sends them to Drupal.

7. **The breadcrumb:**
   - `append_current_page` is on (the starterkit's is off), since the detail
     mockup's breadcrumb ends with the current page.
   - It's rendered in the header's band when it has more than the home link.
   - The detail page's eyebrow is the breadcrumb's parent item; top-level pages
     have none.
8. **The header:**
   - It shows the main menu's top level, as in the mockups.
   - A link is active when it's in the breadcrumb.
   - **The menu query:** the main menu, three levels deep, in its own query like
     the starterkit's `initData`. The sub-pages come from the same tree.
9. **The sub-pages:**
   - An editorial page lists its children in the menu at the top of its body:
     their titles and the menu links' descriptions.
   - The host option "Show sub-pages" is on by default.
10. **The home page:**
    - an editorial page, set as Drupal's front page, so that `/<lang>` (the
      logo's link) works
    - It's not in the main menu; `menu_breadcrumb` adds the home link.
    - Its content is 14b's.
11. **Out of scope:**
    - the site search: 13g, or later
    - the service links and a footer menu (the service links came later, see
      "The header, completed")

## Tasks

### Drupal

- [x] Require and enable the modules (decision 3), with the patches the current
      releases still need.
- [x] Content translation for menu links. The main menu in the forms of detail
      and editorial pages.
- [x] pathauto: the patterns (decision 6) and the settings. Generate the aliases
      of the existing nodes.
- [x] `menu_breadcrumb`: the main menu, with the home link and the current page.
- [x] GraphQL:
  - [x] the `menu` and `breadcrumb` extensions
  - [x] the entity types `menu` and `menu_link_content`
  - [x] the schema loop
- [x] The home page as the front page (`system.site`). It references a node, so
      05's seed has to recreate it.
- [x] `ddev check-routes` with the new aliases.

### Nuxt

- [x] The main menu query and a composable, as in the starterkit's `initData`.
- [x] The route query gets `breadcrumb`. The hosts get it as a prop.
- [x] `PageHeader`: the menu's top level, with the active link.
- [x] `Host/Header`: the breadcrumb in the band; the detail page's eyebrow.
- [x] `Node/Editorial`: the sub-pages, and the host option.
- [x] Texts in EN, DE and FR.
- [x] The design system page.

### Content and plans

- [x] **Test content:**
  - a small main menu in three languages: e.g. "Town hall" (an editorial page)
    over "Building permits" (page 14)
  - the home page
- [x] **05:**
  - the menu links and the front page are content
  - the seed recreates them
  - aliases come from pathauto on save
- [x] **14a:** the menu and the URLs.

## Acceptance criteria

- **The header** shows the main menu in EN, DE and FR; the current section is
  marked.
- **A detail page in the menu:**
  - the breadcrumb from Drupal, with the parent as its eyebrow
  - a URL from its place in the menu
- **An editorial page** lists its sub-pages; the host option hides them.
- **The logo** leads to the home page in every language.
- **News, events and offices** have their prefixed URLs.
- `bun run verify` passes, `drush config:status` is clean, and
  `ddev check-routes` passes.

## As built

### Drupal

- **Modules:**
  - `pathauto` 1.15, `token` 1.17, `token_or` 2.3 and `menu_breadcrumb` 2.0.1
    (`ctools` comes with pathauto).
  - The starterkit's three patches are in `drupal/patches/`: all three problems
    are still in the current releases. The PHP 8.5 one is
    `menu_breadcrumb#3578830` (`menu_breadcrumb!40`).
- **The config** was made by a script in the ignored `tmp/` and exported:
  - one pattern for detail and editorial pages, and nine for news, events and
    offices, one per language
  - the translated menu links: `menu_link_content`'s bundle is
    `menu_link_content`, since there's no `menu_item_extras`
  - the node types' menu settings
  - `menu_breadcrumb.settings`
  - the GraphQL server
- **token** adds a `token` view mode to every entity type; they're exported too.
- **pathauto's `ignore_words`** is its English default, as in the starterkit. It
  also drops words like "an" from German titles ("Bauarbeiten an der Seestrasse"
  becomes `/aktuelles/bauarbeiten-der-seestrasse`).

### Nuxt

- **The route query:**
  - `breadcrumb` (on `InternalUrl`)
  - `mainMenu`, three levels deep
  - The menu isn't in a query of its own, unlike the starterkit's `initData`.
    `useAsyncGraphqlQuery`'s cache key is its name and variables, not the
    language, so a query without variables would show a stale menu after
    switching languages. The route query's path carries the language, like
    `siteConfig` and `footerConfig`.
- **`[...slug].vue`** passes the header's links (the first level, active when in
  the breadcrumb or the current page), the breadcrumb (to every host) and the
  editorial page's sub-pages. `findMenuChildren()` in `helpers/menu.ts` finds
  the sub-pages.
- **`Host/Header`** renders Drupal's breadcrumb when it has more than the home
  link. The detail page's eyebrow is the breadcrumb's second-to-last item.
- **`SubPages`:** a grid under an ink rule, with the menu links' descriptions,
  in a `nav` ("In this section"). `Node/Editorial`'s host option `subPages`
  hides it.
- **`ConfigPage/Site`** passes the links to `PageHeader`, which already rendered
  them.

## Verification (2026-09-27)

- **Gates:**
  - `bun run verify` passes in the container (all 8 gates).
  - `drush config:status` is clean.
  - `ddev check-routes` passes. The aliases reach Nuxt; `/admin/...` and
    `/token/...` reach Drupal.
- **Test content** (EN, DE, FR):
  - home page 16, set as the front page
  - editorial page 17 "Administration"
  - **The main menu:**
    - Living here (15) over pages 1 and 12
    - Administration (17) over pages 14 and 5
  - 31 aliases were generated, e.g. `/de/verwaltung/baubewilligungen`,
    `/fr/services/hotel-de-ville`.
- **Browser, logged in:**
  - **Home:** `/en`, `/de` and `/fr` show the home page; the logo links to
    `/<lang>`.
  - **Breadcrumb:** "Startseite / Verwaltung / Baubewilligungen", with
    "Verwaltung" as the eyebrow, in all three languages.
  - **Caching:** loading several pages in a row, and the first one again, gives
    each its own breadcrumb (the cache context patch).
  - **Header:** the current section is marked, also in the mobile menu at 390
    px.
  - **Sub-pages:** Administration and Living here list theirs, translated.
  - **News, events and offices** have their prefixed URLs and no breadcrumb.
  - **Errors:** no horizontal overflow and no console errors.
- **The editor:** on page 17, the host option hides the sub-pages. Reverted.
- **Drupal's forms:** only detail and editorial pages have the menu settings.

## Notes

- **The starterkit's references:**
  - `drupal/config/default/menu_breadcrumb.settings.yml`
  - `pathauto.pattern.basic_page.yml` and the per-language press release
    patterns
  - `language.content_settings.menu_link_content.main.yml`
  - `frontend/graphql/query.initData.graphql`
  - `frontend/app/components/Breadcrumb/fragment.breadcrumb.graphql`
  - the patches in `drupal/patches/`
- The starterkit's menus are bundles through `menu_item_extras`. Without it, the
  menu links' bundle is `menu_link_content`.

## The header, completed (2026-09-29)

The user compared the header with the mockup: the logo, four main sections, the
search button and the service links (the meta navigation) were missing.

- **Decisions (the user):**
  - The frontend always renders the `Logo`; Drupal has no coat of arms. The site
    config page's `field_coat_of_arms` and its seed media are gone, which also
    drops 14b's coat-of-arms image.
  - The service links are link paragraphs on the site config page
    (`field_service_links`, only `link`), edited in blökkli in the header's
    service bar.
  - The search button is a link to a search page, `/<lang>/search`, which
    doesn't search yet.
- **Content:** the mockup's four sections, as editorial pages in the main menu:
  Living here, Administration, Politics and News (with the latest news and the
  upcoming events). Placeholders until 14b.
- **Nuxt:**
  - `PageHeader`: a `service` slot for the bar (the menu panel below md still
    gets `serviceLinks`), and `searchUrl` instead of the search toggle and its
    panel.
  - `Paragraph/Link/Service.vue` renders a link in the bar (`renderFor` the new
    field list type `service`).
  - `SiteShell` renders the header, `<main>` and the footer around the route
    page and the search page. The search page runs the route query for its path:
    Drupal has no route there, so it only brings the config pages and the menu.
    Its language links are built in Nuxt (`LANGUAGE_NAMES`).
  - Drupal's toolbar (the `drupal` layout) shows from lg only, where it fits,
    and on the search page too; an empty list of local tasks is hidden.
- **Verified:** the header in EN, DE and FR (the current section marked, the
  service links, the search link, the shield); the search page in all three
  languages; the menu panel at 390 px with the service links and no horizontal
  overflow; the service links in the editor (only links, the bar's rendering);
  `ddev check-routes` with `/de/search`.
- **A new UI text needs a second Nuxt restart:** nuxt-graphql-middleware reads
  the texts fragment before nuxt-easy-texts rewrites it, so the first restart
  still serves the old `loadTexts` query.

### The banner (2026-09-29)

The user: the notice becomes its own paragraph type, with options, at the very
top, since its yellow clashed with the band of the page's header below it.

- **`banner`:** `field_title` ("Text", plain, required, translatable) and
  `field_link` (optional). With a link, the text is the link. The option `color`
  (swatches): yellow, blue, green and red, with the callout's icons. Only
  `field_notice` allows it, and it's the only type there.
- **Adding one:** new paragraphs are validated, so the text has a default
  ("Lorem ipsum dolor", as the text paragraph) and is edited in place
  (`editable:field_title`); see the finding on required fields (F7).
- **`PageHeader`:** a `banner` slot after the skip link, above the service bar.
- **Verified:** the banner first in the header in EN and FR, with its link; in
  the editor, the colour swatches, a colour change, and adding a second banner.
