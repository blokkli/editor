# 13c: Hosts

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 13b
- **Part of:** [chunk 13](13-editor-features.md)

## Goal

The content types of Blockingen/Bloquens beyond `page` (14a): news, events and
offices, with the structured data on events and offices. Pages get a sidebar and
a header option, config pages hold the footer and a site-wide notice, and blocks
can reference other hosts.

## Tasks

- [x] **Content types** (fields as in 14a):
  - [x] `news`: title, lead, image, `field_paragraphs`; its date is the
        publication date (`created`)
  - [x] `event`: title, lead, image, date range, place, organiser, category
        (list), price, registration link, `field_paragraphs`
  - [x] `office`: title, lead, address, phone, email, structured opening hours
        (the `office_hours` module), `field_paragraphs`
  - [x] each one's component in `playground-drupal`, its route, and the
        structured fields rendered from data (not blocks)
- [x] **Pages:**
  - [x] `field_aside` (the sidebar), which allows contact, button and downloads
        blocks
  - [x] host options: a `paragraphs_blokkli_host_options` field and
        `defineBlokkliProvider` with a header variant
- [x] **Config pages** (`translatable_config_pages`): `footer` with a paragraphs
      field; `site` with the name, the coat of arms and a site-wide notice as a
      paragraphs field. (2026-09-29: service links instead of the coat of arms,
      see 15c.)
- [x] **Blocks that reference hosts:**
  - [x] `teaser`: a page, news item or event; option card or list
  - [x] `contact`: an office, rendered from its structured data; option compact
        or full
  - [x] entity mappings from `node` (page, news, event → teaser; office →
        contact), so that search results can be dropped onto a page (13g)
- [x] **Import from existing pages** (`import-existing`) and moving blocks
      between hosts (`block-transfer`): find out what they need, and set it up.
      They need nothing beyond the schema and a permission (see Notes).
- [x] Skills:
  - [x] review `blokkli-setup-host-options` (1.1.0)
  - [x] new `blokkli-add-host`: make an entity type or bundle editable
        (`enabled_types`, the paragraphs fields, the GraphQL server, the
        component with `BlokkliProvider`, the route), including config pages
  - [x] `blokkli-add-paragraph-type` (then `blokkli-add-block-type`) 1.1.0:
        section 4 covers content mappings

## Acceptance criteria

- Pages, news, events, offices and both config pages can be edited in the
  editor; the page's header option and sidebar work.
- A teaser and a contact block can be added (through the form, or by
  `add_entity_reference` from a node), and show the referenced host's current
  data. Adding them from search needs a content search provider: 13g.
- `import-existing` and `block-transfer` work between pages.
- The skills exist.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Translatable config pages:** the GraphQL extension is
  `translatable_config_pages` (module `graphql_translatable_config_pages`, part
  of graphql_core_schema). `enabled_types` for config pages hits the schema gap
  in F7.

From [13b](13b-block-types.md) (2026-09-26):

- **Teaser and contact are leaf blocks:** add their fragments to
  `Paragraph/fragment.paragraphLeaf.graphql`, and the bundles to the allowed
  types of section, accordion and columns, and to the library if wanted
  (`allow_library_conversion`).
- **Paragraphs fields on the new hosts** (and `field_aside`): explicit allowed
  types, untranslatable.
- **The width option with a sidebar:** `field_aside` narrows the main column.
  Decide what `wide` and `full` mean on a page with an aside (e.g. both become
  the content width). Decided below.

### The model as built (2026-09-26)

Built by a throwaway script (`tmp/drupal-hosts.php`, as in 13b), then
`drush cex`.

**Modules:**

- `drupal/office_hours` 1.29 (composer)
- `office_hours`, `datetime_range`, `telephone`,
  `graphql_translatable_config_pages`
- the custom module `blokkli_playground` (`drupal/web/modules/custom`), whose
  only code so far is a route subscriber

**Node bundles.** They reuse `field_lead`, `field_hero_image` and
`field_paragraphs`. Translation is on (`untranslatable_fields_hide: '1'`), and
`display_submitted` is false.

| Bundle   | Fields (translatable?)                                                                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `news`   | lead (yes), image (no); the date is `created`                                                                                                                                                                                |
| `event`  | lead, image; `field_date` (daterange, required, no); `field_place`, `field_organiser`, `field_price` (yes); `field_category` (list: culture, sport, family, market, politics; no); `field_registration` (link, no title, no) |
| `office` | lead; `field_address` (string_long, yes); `field_phone` (telephone), `field_email` (no); `field_opening_hours` (office_hours: two slots per day, no comment, no exceptions or seasons; no)                                   |

- Every bundle's `field_paragraphs` allows the page's types.
- **Page:**
  - `field_aside` (Sidebar) allows button, contact and downloads.
  - `field_host_options` is hidden in the form and view displays.
- **Paragraph types:**
  - `teaser` (`field_node`: page, news, event) and `contact` (`field_office`)
  - both required and untranslatable
  - translation off, library conversion on
  - allowed wherever leaf blocks are
- **Config page types** (translation on):
  - `footer`: `field_paragraphs` (button, contact, text)
  - `site`: `field_site_name` (translatable), `field_coat_of_arms` (media
    image), `field_notice` (button, text). Since 2026-09-29 (15c):
    `field_service_links` (link) instead of the coat of arms, and `field_notice`
    only takes banners.
- **`enabled_types`:** node event, news, office and page;
  `translatable_config_pages` footer and site.
- **Entity mappings:** `node__page`, `node__news`, `node__event` →
  `teaser/field_node`; `node__office` → `contact/field_office`.
- **GraphQL server:**
  - the extension `translatable_config_pages`
  - the entity type, the bundles and the fields
  - `footerConfig` and `siteConfig`

**Frontend:**

- `fieldListTypes: ['secondary']` for the aside, the footer and the notice.
- **The width rule:** Text, Button, Downloads and Contact set
  `container-content` only in the main content
  (`!parentType && fieldListType === 'default'`).
- **The page body:**
  - The aside is a `BlokkliField` with `non-empty-class="has-aside"`.
  - `.page-body:has(> .has-aside)` in `main.css` makes a two-column grid on
    large screens. Without blocks in the aside it sits below the content, and
    only while editing.
- **Host options:** `Node/Page` defines `header` (image, overlay, plain) and
  passes it to `Host/Header`.
- **Components:**
  - `Host/Header` is shared by the four node bundles. The office passes no
    image, so the header has no droppable for a field it lacks.
  - `Office/Details` (fragment `officeDetails`) is used by `Node/Office` and the
    contact block.
  - `ConfigPage/Footer` and `ConfigPage/Site` have their own providers with
    `edit-path` set to their own URL.
- **Routing:**
  - The route query spreads every host and loads `siteConfig` and
    `footerConfig`.
  - `[...slug].vue` renders the site header, the node and the footer, or a
    config page on its own.
- **Helpers:**
  - `app/helpers/date.ts`: `Intl` with `Europe/Zurich`; dates come as
    `startDate(format: "c")`. `created` was recorded as a Unix timestamp, but
    it's an ISO 8601 string, which crashed the news date (fixed in 13d: Drupal
    formats the dates now)
  - `app/composables/useLanguage.ts`
- **`pbMutatedEntity`** only has the fields edited on the page.

### Decisions (2026-09-26)

- **Config pages get a frontend URL** (the user): the route subscriber moves
  `entity.translatable_config_pages.canonical` to `/blokkli/config-page/{id}`,
  as paragraphs_library does for library items.
  - Without it, open editing, the language switch and previews would lead to
    `/admin/config/translatable-config-pages/{id}`.
  - `route(path:)` resolves the new path, and the footer and site header edit
    there (`edit-path`).
- **Opening hours use `office_hours`** (the user), rendered from data in the
  office page and the contact block. Its `status` is broken and depends on the
  time: not used.
- **The aside layout follows its content** (`non-empty-class`) instead of
  `isEditing`, so what editors see matches the published page.
- **Every width option means the main column** on a page whose aside has blocks
  (13b's open question).
- **No content search provider yet.** The mappings are checked through
  `add_entity_reference`; search is 13g's.
- **import-existing and block-transfer need no setup:**
  - Their schema gates pass.
  - import-existing only copies between entities of the same type and bundle,
    from the published source.
  - block-transfer needs `transfer blokkli paragraphs` (the admin role only for
    now; roles are 13h).
- **Category labels are English in the frontend:** `list_string` only exposes
  the key.

### Verification (2026-09-26)

- **Config:** `drush si --existing-config -y`, and `config:status` is clean.
  - The config schema check shows F7's gaps, now including
    `enabled_types.translatable_config_pages`.
- **The schema dump** has every new type (`NodeNews`, `NodeEvent`, `NodeOffice`,
  `TranslatableConfigPagesFooter`/`Site` with `blokkliProps`, `ParagraphTeaser`,
  `ParagraphContact`, `FieldItemTypeOfficeHours`), and `footerConfig`,
  `siteConfig` and `TRANSLATABLE_CONFIG_PAGES`.
  - No `…Unexposed`, and nothing was removed.
- **`pbGetFieldConfig`** matches the model for every field, including the aside,
  the footer and the notice.
- **The route query** through the Nuxt proxy returns every bundle and
  `/en/blokkli/config-page/1`.
  - In FR the site name is Bloquens. The proxy needs the client's language
    (`__gqlc_language`) to pick the endpoint.
  - Open editing of a config page redirects to
    `/en/blokkli/config-page/2?blokkliEditing=…`.
  - Its translations' URLs have their language prefix.
- **Mutations as admin** (`tmp/drupal-hosts-mutations.sh`):
  - `update_host_options`, then publish: `blokkliProps.hostOptions` has it
  - `add_entity_reference` (news → teaser, office → contact into the aside)
    works, and office → teaser is refused (no mapping)
  - `replace_entity_reference` and `copy_from_existing` (page → page) work
  - export and `import` into a news item work
  - adding to a config page's notice, then publishing, works
  - `add` and `import` accept block types the field doesn't allow, and publish
    keeps them: F16
- **The node form:**
  - Saving it unchanged keeps the host options.
  - With the widget visible, the same save deleted them, which confirms that the
    field must stay hidden.
- **The components** compile in Vite, `typecheck:playground-drupal` passes, and
  the daemon reports "supports all features". `bun run verify` passes all 8
  gates.
- **Not verified in the browser** (for the user, on `/en/node/5` and the config
  page routes):
  - the header variants
  - the aside while viewing and editing
  - teaser and contact rendering and adding
  - the footer's and notice's edit buttons, and their routes
  - the language switch while editing a config page
  - import and transfer

## Changed after chunk 05 (2026-09-28)

The user changed the model after trying chunk 05's bake (see
[14a](14a-demo-concept.md#block-types)): `button` became the generic `link`,
`downloads` became `link_list` (link blocks instead of `field_documents`), and
the teaser links to any URL (`field_link` with title, lead and image overrides
instead of `field_node`). Detail pages allow no sections and no fragments.
