# 14a: Demo concept

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 04

## Goal

Decide what the demo is about, and derive the content model from it: the node
bundles, paragraph types and fields that chunk 13's sub-chunks build. The
content itself is written in [14b](14b-demo-content.md).

Split off from chunk 14 on 2026-09-26. The user: settle the demo soon, before
paragraph types and bundles get added that end up wrong for it.

## Tasks

- [x] Decide the topic: **a fictional Swiss municipality** (see Notes). Original
      criteria:
  - non-fictional if at all possible (dropped, see Notes)
  - a genre everyone knows, so obvious edits come to mind
  - content that needs the blocks (tables, charts, galleries, video, a map,
    reused boxes, interlinked pages)
  - plausibly trilingual
  - images that may be redistributed in the repo and the public sandbox
  - no dates that go stale
  - not an imitation of a real organisation's website
- [x] The pages: what each one is for, and which blocks and features it shows.
- [x] The content model:
  - [x] node bundles and their fields, and which hosts have which paragraph
        fields
  - [x] paragraph types and their fields, including bespoke ones (e.g. caption
        and copyright on images, quotes, tables)
  - [x] fragments, library items, templates, config pages
  - [x] what happens to chunk 04's types (title, text, image, video, button):
        keep, extend or rename
- [x] Give every blökkli feature a place in the demo (the feature matrix in
      [chunk 13](13-editor-features.md)). List the features that have no natural
      place: none, see "Where the features happen". Maps are dropped by
      decision.
- [x] The media: the licence rules (see Images). The files are collected in 14b.
- [x] Update 13b–13i with the parts of the model they build.

## Acceptance criteria

- The user signed off the topic and the content model.
- Every sub-chunk of 13 that adds bundles, types or fields references the model.

## Concept (signed off by the user, 2026-09-26)

### The town

- A small town on the German–French language border, by a lake, about 15,000
  inhabitants. German and French are its languages; English is for international
  readers (and the source language of the site). Since chunk 05, a bake can make
  German or French the content's source language instead.
- **Blockingen / Bloquens**, a bilingual name like Biel/Bienne (see "The name").
- Invented coat of arms, people and addresses. Photos show no recognisable real
  landmarks or place names.

### Content types (hosts)

| Bundle               | Fields                                                                                                      | Paragraph fields                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `page` (detail page) | title, lead, responsible office (15d)                                                                       | `field_paragraphs`, `field_aside` (sidebar) |
| `editorial` (15d)    | title, lead, hero image, host options (header variant)                                                      | `field_paragraphs`                          |
| `news`               | title, lead, image; the date is the publication date                                                        | `field_paragraphs`                          |
| `event`              | title, lead, image, date range, place, organiser, category (list), price, registration link                 | `field_paragraphs`                          |
| `office`             | title, lead, image (15e), address, phone, email, opening hours (structured, e.g. the `office_hours` module) | `field_paragraphs`                          |

- `field_aside` on pages holds contact boxes, related links and downloads, and
  allows only those types. It covers "a host with several paragraph fields"
  (13c).
- **Changed in [15d](15d-page-types.md) (the user, 2026-09-27):**
  - `page` is the detail page: no hero image and no header option.
  - Its responsible office feeds the header and the contact fragment, which new
    pages get in their sidebar.
  - The editorial page is new: the home page, overview pages and landing pages.
- **Changed in [15c](15c-site-structure.md) (the user, 2026-09-27):**
  - Detail and editorial pages are in the translated main menu. It gives them
    their URLs (pathauto) and breadcrumbs (`menu_breadcrumb`).
  - News, events and offices have a URL prefix per language.
  - The home page is an editorial page, set as the front page.
- **Changed in [15e](15e-events-and-offices.md) (the user, 2026-09-27):**
  offices have a hero image, like news and events.
- Config pages: `footer` (a paragraphs field) and `site` (name, coat of arms, a
  site-wide notice with a paragraphs field). Covers 13c.
- Library items and templates are hosts too (13d).

### Block types

**Everyday blocks:** what an average page is built from.

| Type        | Fields                                     | Options                    | From 04        |
| ----------- | ------------------------------------------ | -------------------------- | -------------- |
| `title`     | title                                      |                            | yes            |
| `text`      | rich text                                  |                            | yes            |
| `image`     | media, caption                             | width: content, wide, full | yes, + caption |
| `video`     | remote video                               |                            | yes, embedded  |
| `button`    | link or document, text                     | style: primary, secondary  | yes            |
| `table`     | text with a tables-and-links format        | striped                    | new            |
| `downloads` | documents (several)                        |                            | new            |
| `contact`   | office (reference)                         | compact, full              | new            |
| `teaser`    | page, news or event (reference)            | card, list                 | new            |
| `gallery`   | image blocks (several)                     | grid, slider (proxy mode)  | new            |
| `chart`     | chart data (charts module)                 | chart type, per the module | new (13i)      |
| `embed`     | URL, heights per viewport (iframes module) |                            | new (13i)      |

**Structure:** nesting only where it makes sense.

| Type        | Holds                                                   | Options                                          |
| ----------- | ------------------------------------------------------- | ------------------------------------------------ |
| `section`   | a heading; everyday blocks, accordion, columns          | background colour; children in 1, 2 or 3 columns |
| `accordion` | one item per block: a title, everyday blocks or columns |                                                  |
| `columns`   | two paragraph fields (left, right), everyday blocks     | ratio: 50/50, 33/66, 66/33                       |

The deepest path is the user's example: section > accordion > columns > text.
The gallery isn't allowed in columns, which keeps the model at 4 levels.

13b built this with a few changes (the accordion, the gallery, the table option,
the credit, `width` as a global option): see its
[Decisions](13b-block-types.md#decisions-2026-09-26-deviating-from-14a).

**Media:** the image media type gets a credit field (one line: author, source,
licence), shown with every image. Captions stay on the block, since they depend
on where the image is used.

**Fragments** (no fields of their own): "upcoming events" and "latest news"
(lists from the structured data), and a table of contents (13i).

**Library items** (reused on several pages): emergency numbers, "what goes into
which bin", "stay informed" (newsletter).

**Templates:** a service page (lead, steps as an accordion, fees table,
downloads, contact), and default contents for new columns.

Dropped for now: a quote block and a key figures block. Charts and tables cover
the numbers.

### Pages

About 20 pages, 6 offices, 6 news items and 10 events, in three languages. 14b
can trim the lighter ones.

- **Home:** teasers, the upcoming events and latest news fragments, the
  site-wide notice.
- **Living here:** moving here (a service page), waste and recycling (tables,
  the library box), schools.
- **Town hall:** the offices, building permits (a service page: steps,
  downloads, a contact box).
- **Leisure:** **the lakeside pool** (the page visitors land on, see below), the
  library, clubs.
- **Politics:** the town council (a table of fictional members), votes and
  elections (result charts).
- **The town in numbers:** population, budget, recycling rate (charts).
- **History:** a gallery of old photos.

**The landing page, "The lakeside pool":** a gallery slider, opening hours and
prices as tables, the pool rules as an accordion, a contact box, the season's
opening as a scheduled news item, and a few planted mistakes for the analyzer
(an image without alt text, a table without a header row, an outdated French
translation).

### Where the features happen

- **Scheduling:** news set to publish later; events that unpublish themselves
  after their date; a "pool closed" notice block scheduled to disappear.
- **Translation:** DE and FR are both real languages of the town; one French
  page is deliberately outdated.
- **Search:** finds offices, events and news to drop in as contact or teaser
  blocks (entity mappings from `node`).
- **Transform:** search and replace, e.g. a renamed office across a page.
  **Conversions:** text ↔ title, button → text.
- **Comments and roles:** a department editor, the head of the department as
  reviewer, a French translator, and a restricted editor who can't use some
  blocks.
- **Host options:** the page header variant. **Block options:** in the tables
  above.
- **Import and transfer:** copy blocks from one service page to another.
- **Charts:** the town in numbers, election results. **Analyze:** the planted
  mistakes.

### Which sub-chunk builds what

| Sub-chunk | Builds                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13b       | The everyday blocks without references (title, text, image, video, button, table, downloads, gallery), the structure blocks (section, accordion, columns), the image credit, block options |
| 13c       | `news`, `event`, `office`, the page's `field_aside` and header option, the config pages, and the blocks that reference hosts (teaser, contact) with their entity mappings                  |
| 13d       | The library items, the fragments "upcoming events" and "latest news", the templates                                                                                                        |
| 13e       | Scheduling on news, events and blocks; revisions; preview grants                                                                                                                           |
| 13f       | Translation settings for every new bundle and field; the language switch                                                                                                                   |
| 13g       | Search providers for offices, events, news, pages, media and the library; the example plugins                                                                                              |
| 13h       | The roles, comments and notifications                                                                                                                                                      |
| 13i       | The chart and embed blocks, the table of contents fragment, a custom analyzer                                                                                                              |
| 14b       | The content: pages, offices, news, events, images, the planted mistakes                                                                                                                    |

### Dates that don't go stale

Events and news are seeded with dates relative to the bake (e.g. "in 12 days,
19:30"). Chunk 05's bake resolves them, and the hosted instance re-bakes
regularly (chunk 12).

### Images

Openly licensed photos from Flickr and similar platforms (the user). Allowed:
CC0, public domain, CC BY and CC BY-SA, with the credit in the media credit
field. Not allowed: NC (the sandbox promotes a product) and ND. 14b records
every file's source and licence.

### Decided (the user, 2026-09-26)

- **Tables** are a text field with their own text format that only allows tables
  and links. They're edited like other rich text (through the form). blökkli's
  inline table editing isn't used; `paragraphs_blokkli` doesn't report a table
  editable type.
- **No maps.** The embed block (iframes module, 13i) needs another use, e.g. the
  video embed. Decided in 13i: the fee calculator, a page of the Nuxt app. Other
  sites can't be framed, so the video stays a link.

### The name (decided, 2026-09-26)

- **Blockingen / Bloquens** (the user proposed Blockingen). The name gives away
  that it's fictional as soon as you know the product.
  - `-ingen` is a common Swiss German suffix (Beringen, Flurlingen).
  - French `-ens` is its Romand counterpart (Ecublens, Ferlens): both come from
    the same Germanic suffix. French speakers hear _bloquer_.
  - Like Biel/Bienne, the official name is bilingual; each language uses its own
    form in running text. The lake: Blockingersee, Lac de Bloquens, Lake
    Blockingen.
- **Checked** (2026-09-26): neither name is in the BFS register of
  municipalities (snapshots 1900–2015, via
  `https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date=DD-MM-YYYY`) or
  in swisstopo's register of localities and postcodes. A web search found no
  real place or brand by either name.
- **Bloquens** is close to _Bloquons tout_ ("let's block everything"), a French
  protest movement from 2025. Accepted as far enough away; Blocquens would be
  the fallback spelling.
- Earlier candidates, checked the same way: Lindrach/Lindray, Brünach/Brunay,
  Trevach/Trévay, Sornach/Sornay, Lorenach/Lorenay, Tellach/Tellay,
  Warnach/Varnay.

## Notes

### Decision: a fictional municipality (the user, 2026-09-26)

After the brainstorm below, the user chose a fictional Swiss municipality:

- It offers many kinds of content: service pages, knowledge pages, news,
  politics, leisure.
- It has structured data as a second use case, e.g. events.
- This overrides the earlier "non-fictional if at all possible". A fictional
  town can't imitate a real organisation, as long as its name, coat of arms and
  people are invented.

### Answers (the user, 2026-09-26)

- **The town:** a bilingual town on the German–French language border, by a
  lake, about 15,000 inhabitants.
- **Offices** are their own content type with structured fields (opening hours,
  contact), not just a reusable box.
- **Images:** openly licensed photos from Flickr and similar platforms.

### Direction (the user, 2026-09-26)

- **Audience:** everyone, but the focus is potential clients in Switzerland.
- **What blökkli is for:** easy page building for content-heavy sites
  (Winterthur, Basel-Stadt: around 300 people actively edit thousands of pages
  there). It's a tool that must work; no marketing landing pages, no bespoke
  styling per page. Everything fits together (spacing, colours), which is why
  blocks can't be dragged around freely as in Framer.
- **Flexibility comes from options:** background colours, layout options, up to
  complex ones like proxy mode for galleries (a slider shows one image at a
  time, so its images can't be dragged directly).
- **The demo should:**
  - be content-heavy without looking boring
  - have a sane set of block types where everything makes sense. The average
    page is built by dragging in text, images, tables and the like. Nesting only
    where it makes sense, e.g. container > accordion > two columns > text, not
    deep nesting for a basic page.
  - show some freedom through options, so not everything looks fixed
- **First contact:** visitors start in edit mode on a page that already has
  proper content, and will almost certainly click a block right away to try
  dragging and editing. That page has to be good.
- **Topic:** non-fictional if at all possible; fictional is the fallback.

### Brainstorm (2026-09-26)

Three agents brainstormed from different angles: public-sector realism, engaging
material, and questioning the framing. The owner had rejected the Rhine, the
Gotthard, the UNESCO sites, a tourism region, a fictional museum and a fictional
municipality. The licence facts below are as the agents reported them. Check
them before relying on them.

**Shortlist:**

- **City trees** (two agents independently ranked it first):
  - how cities plant, protect and replace street trees; species portraits as the
    second bundle
  - hook: Geneva's official chestnut, whose first leaf has been recorded since
    1818 (a chart)
  - Zurich's tree register is CC0; Basel's is probably CC BY
  - images: PD botanical plates (Köhler 1887, Thomé 1885 via BHL) and our own
    photos
  - fits: seasons give scheduling and section colours a meaning; container >
    accordion (bark types) > two columns (plate and text); a reusable pollen or
    "damaged tree?" box
  - risk: calm; photos across seasons take a year; video is weak
- **Weather and climate** (all three agents):
  - Föhn, the fog sea, records (41.5 °C Grono 2003, −41.8 °C La Brévine 1987),
    weather stations as the second bundle
  - MeteoSwiss open data since 2025 (source credit; CC BY 4.0); GLAMOS glacier
    data CC BY 4.0; NASA satellite images PD
  - risk: overlaps MeteoSwiss's own site; climate reads as political; few good
    photos
- **Recipes from the archive:**
  - real 19th-century Swiss recipes (_Basler Kochschule_, 1877), each quoted
    from the PD source next to a retested modern version
  - the most natural editing: reorder steps, change amounts in a table
  - risk: needs a cooking and photo shoot; public-sector buyers may not see
    their own site in it
- **Switzerland in space:**
  - the Bern solar wind sail on Apollo 11, 51 Pegasi b (Geneva 1995), the ROSINA
    comet smell; missions as the second bundle
  - NASA images and video are PD (no logos or endorsement); ESA images are CC
    BY-SA 3.0 IGO
  - risk: "fun, but not our kind of content"

**Also proposed:**

- votes and direct democracy (Swissvotes, CC BY 4.0; political, few images)
- a calendar of customs, or an almanac of twelve monthly pages
- Mittelholzer's 1920s aerial photos (PD) and swisstopo's hidden map drawings
- drinking water, civil protection, electricity, languages, waste sorting,
  mushroom checks (liability)
- Scheuchzer's 1723 Alpine dragon reports

**Across all ideas:**

- One agent's reading of the rejections: those sites had no publisher and no
  purpose. They were "a site about X". Pick a genre with a job first: help
  people do, identify or follow something.
- **Planted mistakes** (from the "write for everyone" wild card, usable with any
  topic): the landing page carries a few real issues for the analyzer to flag,
  such as a missing alt text, a table without a header row and an outdated
  translation.
- **Our own photos** of public space give CC0 images with a consistent look.
  Found images only fill gaps.
- **CC BY-SA:** most of Commons and much of ETH's image archive. Fine unmodified
  with a credit, but crops stay BY-SA. Decide once whether it's acceptable.
- **Swiss photo law (URG Art. 2 Abs. 3bis, since 2020):** photos of PD paintings
  may be protected in Switzerland. Prefer sources that mark their files PD or
  CC0 themselves (ETH E-Pics, BHL, NASA, CC0 museums) over Commons "PD-Art".
- **Federal statistics (BFS)** need only a source credit, for commercial use
  too, since 15 July 2026.
- Don't use the Swiss newsreel archive (Filmwochenschau): educational use only.

### Earlier candidate

- **(2026-09-26) A fictional museum.** Superseded by the preference for a
  non-fictional topic, but its reasoning still applies:
  - Museums' open-access collections (the Met, Rijksmuseum, Art Institute of
    Chicago, Smithsonian) publish public-domain works as CC0, so the images are
    licence-clean and fit together.
  - Pages: home, an exhibition, visit (prices, hours, map, questions and
    answers), "the museum in numbers" (charts), a journal article.
  - It fits scheduling (the next exhibition, a holiday closure), comments and
    outdated translations naturally.
  - Not decided.
