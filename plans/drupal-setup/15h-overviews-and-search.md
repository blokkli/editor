# 15h: Overview pages and search

- **Status:** done
- **Milestone:** M1 Local dev site
- **Depends on:** 15f

## Goal

The site's last missing pages: the overviews of all news, events and official
publications (the automatic teaser list's "all" links led to `#`, 15f), and a
working search (the search page and the home page's field did nothing).

## Decisions (the user, 2026-09-29)

1. **Hardcoded frontend pages,** as in winterthur: Drupal's `frontend_routing`
   locks the aliases of the nodes assigned to them. vuepal's `frontendRouting`
   writes the module's config from the Nuxt pages' `definePageMeta`. Each page
   renders its node (title, lead, blökkli paragraphs), then its hardcoded part.
2. **nuxt-language-negotiation** replaces the hand-written language routing
   (chunk 06 left it out to start minimal). vuepal's `frontendRouting` is built
   around its `languageMapping`. Every language keeps its prefix.
3. **Filters:** events by category, publications by type, news none. Pages
   through `?page=`. Filters and pages live in the URL query.
4. **Search:** Search API with the database backend, full text: titles, leads
   and the paragraphs' text of every content type, per language. It's exposed as
   a GraphQL field from `blokkli_playground`. Results are rows with their type,
   with pages.
5. **The components first:** chips, pagination and the result row on the design
   system page, with two mockups. Accepted (2026-09-29).

## Tasks

- [x] `FilterChips`, `Pagination`, the mockups `overview` and `search`
- [x] nuxt-language-negotiation: the pages left `pages/[lang]/`
- [x] `frontend_routing`, the seeder, the four nodes, the menu
- [x] The overview pages (`NodeOverview`, `helpers/nodeList.ts`)
- [x] The search (the index, the GraphQL field, the page, `SearchField`)
- [x] Texts, plans (14a, 15f)

## Notes

### nuxt-language-negotiation (2026-09-29)

- In `modules` after `vuepal`, which checks the order. The languages are
  `LANGUAGES` from `shared/languages.ts`; each prefix is its code.
- Negotiator: `pathPrefix()`. Its `frontRedirect` middleware sends `/` to `/en`,
  which replaces the `routeRules` redirect.
- **The pages left `pages/[lang]/`:** the front page, the search, the design
  system and its mockups, the fee calculator and the library item. Their paths
  are unchanged: the module gives them a `:langPrefix(en|de|fr)` param, so their
  `isLanguage(route.params.lang)` checks are gone.
- **`[...slug].vue`** stays the top-level catch-all. It still 404s a path
  without a language (`getLanguageFromPath`).
- **`useLanguage()` and the GraphQL client options** use the module's
  `useCurrentLanguage()`.
- **The template editor** now has the prefix, `/en/blokkli/template/<uuid>`.
  blökkli resolves it by name, and the module's router adds the current language
  (`templatesGetEditUrl` gives `/de/blokkli/template/…` in German).
  `ddev check-routes` checks the prefixed path.
- **Checked:**
  - the front page, a page, the news page, the design system and its mockups,
    the fee calculator, the search page and a library item, in their languages
  - the language switch, the header's search link and the template editor (4
    blocks)
  - `/` to `/en`, and `/events` or `/xx/foo` as a 404
  - `bun run verify` and `ddev check-routes`

### Frontend routes (2026-09-29)

- **Drupal:** `drupal/frontend_routing` 1.0.9. Its config,
  `frontend_routing.settings.yml`, is written by vuepal (`frontendRouting` in
  `nuxt.config.ts`) from the pages with `drupalFrontendRoute`: the key is the
  route's name, the aliases are `path` (English) and `languageMapping`. After a
  change to a page's paths: restart Nuxt, `drush cim`, bake.
- **The seeder** (`frontend_route: <name>` in a node's file, see the content
  README) assigns the nodes as the module's form would: the state
  `frontend_routing.settings`, then the node's aliases from the config. The
  module has no API for it, and nothing applies the config on import. Its
  presave hook then keeps pathauto off for these nodes.
- **The nodes** are editorial pages with a plain header: News (the existing
  "Aktuelles", its two teaser lists gone), Events, Official publications (both
  children of News in the menu, so they're its sub-pages) and Search.
- **The pages** (`pages/news.vue`, `events.vue`, `publications.vue`,
  `search.vue`) render `FrontendRoute`: the route query, 404 without an
  editorial node, `SiteShell` and `NodeEditorial` with the page's part in its
  new default slot. The search page overrides the header slot to put the field
  in the band (`NodeEditorial` passes the breadcrumb to it now).
- **Links** use the route name: the teaser list's "all" link
  (`router.resolve({ name: source })`), the header's search link and
  `SearchField`.

### The overview pages (2026-09-29)

- `helpers/nodeList.ts` holds each source's filter and sort, moved from the
  teaser list; one query, `nodeList` (with `total`), serves both.
- `NodeOverview`: news as cards (6 per page), events and publications as rows (8
  per page). The page and the filter (`category`, `type`) are the URL's query;
  an unknown value is ignored. Chips: "All" and the field's values
  (`EVENT_CATEGORIES`, `PUBLICATION_TYPES`, next to their label composables; the
  publication type "other" is "Other" there).
- `useEventCategory()` replaces `Node/Event`'s inline switch.
- **aria-current:** RouterLink ignores the query, so it marks every link to the
  same path as the current page. The chips and the pagination set it themselves.

### The search (2026-09-29)

- **Search API:** the server `database` (search_api_db, partial matching, so
  "bau" finds "Baugesuch" and "Anbau") and the index `content` (every node in
  every language: title, lead, paragraphs' text, type, status). Indexed directly
  on save; `ddev bake` runs `drush search-api:index` too.
- **Not the rendered node** (the plan's `rendered_item`): paragraphs without
  fields to translate (link lists, steps, columns, galleries) aren't
  translatable, and Drupal renders their children in their own language, so the
  German index got the English steps. The processor
  `blokkli_playground_paragraphs_text` (`src/Plugin/search_api/processor/`)
  collects the paragraphs' text fields instead, each paragraph in the item's
  language, library items included.
- **GraphQL:** the extension `blokkli_playground_search` adds
  `Query.search(text, offset, limit): SearchResult { total items }`. Its data
  producer queries the index in the current language; graphql_core_schema's
  default resolver reads `total` and `items` from its array and checks the
  access to the nodes. The cache tag `search_api_list:content` invalidates it.
- **The page:** `SearchResults` (`?text=`, `?page=`, 10 per page) with
  `NodeTeaser`'s new `result` display: the content type above the title, then
  the date, the publication's meta or the lead. The summary keeps the text its
  results are for, while the next ones load.
- **`SearchField`** is a form (`action` the search page, `name="text"`) that
  navigates on submit: the home page's field, the search page's.

### Verification (2026-09-29)

- `ddev bake` and `ddev bake --source=de`: `drush config:status` clean, the
  index complete (57 items), the four routes assigned. `bun run verify`: all 10
  gates. `ddev check-routes`.
- **Browser, EN, DE and FR, at 390 and 1440 px,** without horizontal scrolling
  or console errors: the three overviews and a search in each language.
  - the chips filter (`?category=market`: the autumn market only)
  - "bau" finds 5 pages in German, including a publication and an office; a
    step's title ("Einsprachefrist") finds building permits; "die" has two pages
    of 13; a nonsense word says so, with the hint
  - the home page's field and the search page's own lead to the results
  - the header's search link and the home page's "all" links
  - the language switch links the routes' aliases
- **Editor:** the events page loads in blökkli; a text added to its blocks sits
  above the list, which still renders. Drupal's node form says the node is
  managed by frontend routing.
