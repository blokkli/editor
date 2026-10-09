# Content

The content that `ddev bake` seeds, with `blokkli_playground`'s seed command
(`drush blokkli-playground:seed --source=en`). Every file is checked first;
nothing is created while a file has problems, and each one is reported with its
file and path.

| File               | Entities                                            |
| ------------------ | --------------------------------------------------- |
| `users.yml`        | users (the admin comes from the installation)       |
| `media.yml`        | media, with their files from `files/`               |
| `terms.yml`        | taxonomy terms: the locations of the offices        |
| `library.yml`      | library items                                       |
| `nodes/<key>.yml`  | one node per file                                   |
| `templates.yml`    | paragraph templates                                 |
| `config_pages.yml` | the translatable config pages `footer` and `site`   |
| `menu.yml`         | menu links, as a tree per menu                      |
| `comments.yml`     | comment threads on paragraphs                       |
| `texts.csv`        | the frontend's UI texts, in the texts module format |

They're created in that order. Nodes that reference other nodes are created
after them.

## An entity

```yaml
key: building-permits # required, unique per entity type
type: page # the bundle
title: { en: Building permits, de: Baubewilligungen, fr: Permis de construire }
field_office: { node: building-planning }
field_paragraphs:
  - type: section
    options: { background: stone, columns: 2 }
    field_title: { en: Applying, de: Gesuch einreichen, fr: Déposer une demande }
    field_paragraphs:
      - type: text
        key: counter-text # optional; comments refer to paragraphs by key
        field_text: { en: <p>…</p>, de: <p>…</p>, fr: <p>…</p> }
```

- **Everything but `key`, `type`, `id`, `source`, `options`, `outdated`,
  `frontend_route`, `invalid` and `deleted` is a field.** A field the bundle
  doesn't have is an error.
- **`invalid: true`:** broken on purpose, only for the E2E tests' fixtures
  (`test/e2e-drupal/content`). The seed doesn't check whether the field allows
  the paragraph, nor the entity's constraints. Its own paragraphs are still
  checked.
- **`deleted: true`:** users and nodes, only for the E2E tests' fixtures. The
  seed creates the entity, then everything else, then deletes it. A user's
  comments stay, without an author; the notifications about a node stay,
  without a page to link to.
- **`id`:** nodes only. The front page (`system.site.page.front`) is `/node/1`,
  so the home page has `id: 1`. The other nodes get the next free IDs, in the
  order of their file names.
- **`frontend_route: events`:** nodes only. The node is the one of a hardcoded
  page in the Nuxt app (e.g. `pages/events.vue`): frontend_routing gets it
  assigned, and its aliases are the route's paths in
  `config/sync/frontend_routing.settings.yml`.
- **The UUIDs are derived from the keys:** every bake gives an entity the same
  UUID.

## Languages

- **A language map** gives a value per language: `{ en: …, de: …, fr: … }`. Only
  translatable fields (and properties, like an image's `alt`) can have one.
- **The source language** is chosen per run: `ddev bake --source=de` makes
  German the original of every entity and English and French its translations.
  A language map without a value in the source language is an error, so give
  every language. An entity can pin its own with `source: de`; its paragraphs
  have its source language.
- **An entity gets a translation in every language of its maps,** its
  paragraphs' included. A language a map lacks gets the source's value there.
- **A paragraph only gets a translation in the languages of its own maps** (and
  its nested paragraphs'). With plain values only, it has none, even in a
  translated node: the editor shows it as untranslated there.
- **A plain value on a translatable field** is the same in every language.
- **`outdated: [fr]`** flags the French translation of the entity and its
  paragraphs as outdated.
- Templates aren't translated (content translation is off for them): they get
  their source language's values.
- The UI texts in `texts.csv` stay English-based, like the defaults in the
  frontend's code.

## Values

| Field type                               | Write                                                          |
| ---------------------------------------- | -------------------------------------------------------------- |
| entity reference                         | `{ node: key }`, `{ media: key }`, `{ term: key }`, `{ library: key }`, `{ user: key }` (`admin` is uid 1) |
| paragraphs (entity reference revisions)  | a list of paragraphs: `type`, `options`, fields                |
| link                                     | `{ node: key }`, `{ media: key }` (a document), `/internal/path` or `https://…` |
| formatted text                           | the markup; the field's first allowed format is used           |
| image, file                              | `{ file: images/old-town.jpg, alt: … }`, a path in `files/`        |
| date, date range                         | `'+12 days 19:30'` or `{ value: …, end_value: … }`             |
| created, timestamp                       | `'-3 days'`                                                    |
| anything else                            | the field's own values, e.g. office hours items                |

Dates are relative to the bake, in the site's timezone, so events and news don't
go stale.

**Options** are a paragraph's blökkli options. They're never translated. Maps
are stored as JSON (the chart's `data`, the embed's `heights`). A chart keeps
its texts in the source language and translations of them: give every language
in its `translations`, and the seed moves the source language's texts into the
chart itself.

## Menus and comments

```yaml
# menu.yml
main:
  - key: administration
    title: { en: Administration, de: Verwaltung, fr: Administration }
    link: { node: administration }
    children:
      - key: building-permits
        …
```

Pages and editorial pages get their URL from their place in the menu. A URL
whose first segment is one of the paths nginx sends to Drupal (`comments`,
`media`, `user`, …, see the sandbox skill) shows Drupal's page, not the
frontend's: give the node another title.

```yaml
# comments.yml
- key: counter-question
  host: { node: building-permits }
  paragraphs: [counter-text]
  uid: { user: anna }
  body: '<p>@{marc} Are the counter hours still right?</p>'
  replies:
    - key: counter-answer
      uid: { user: marc }
      body: '<p>Yes, they are.</p>'
```

`@{marc}` mentions a user; the comment module notifies them, as in the editor.
`resolved: true` on the first comment resolves the thread.

## The town and its texts

Blockingen (Bloquens in French) is a fictional bilingual town of about 15,000
people by a lake, on the German–French language border. Its lake is the
Blockingersee, Lac de Bloquens or Lake Blockingen. The town is Bloquens in
French, also as the site name. Streets have French names in French (rue du
Village) and keep the German ones in English.

- **Swiss spelling** (ss, no ß), formal Sie, "Fr. 45.–", "8.00 Uhr".
- **No current years in running text** (history is fine); dates belong in date
  fields, relative to the bake.
- **Everything is invented:** people, addresses, phone numbers (032 555 01 xx),
  email addresses (`@blockingen.example`). No canton by name, no real parties,
  no real places in photos.
- **Detail pages** carry about 300–600 words of real content, and generally no
  image.
- **Some mistakes are on purpose,** for the analyzers and the welcome page's
  tasks: on the lakeside pool (`nodes/lakeside-pool.yml`, see its comment), the
  pool opening's outdated French (`outdated: [fr]`, with other hours than the
  German), and `jetty-view` without alt text. Don't fix them.
- Themen is "Thématiques" in French: "Thèmes" would give `/fr/themes`, which
  pathauto turns into `/fr/themes-0` (a folder in the docroot).

## Photos

The photos in `files/images/` are AI-generated from one brief for the whole town,
so new ones look like the same place. Each file is named after its media key and
saved as JPEG at quality 82; the credit is "AI-generated". The brief's shared
part:

> Photos for the website of Blockingen (in French: Bloquens), a fictional Swiss
> municipality of about 15,000 people. The town is bilingual, German and French,
> and lies on the shore of a lake at the foot of wooded hills, with vineyards on
> the slopes above it. It has a small historic old town, a railway station,
> residential quarters, and some light industry at its edge.
>
> The place: an ordinary, well-kept Swiss small town, lived in, not a postcard.
> Its buildings are what you'd find there: stone and plastered houses with steep
> tiled roofs in the old town, and buildings from every decade since, including
> plain post-war and contemporary ones.
>
> The photos: documentary photographs, as a municipality would commission from a
> local photographer for its website. Eye level, natural daylight, true-to-life
> colours, a calm and friendly mood. The same season and light across the whole
> set: late summer, soft sun or light cloud. They should look like one town.
>
> People: few and incidental, going about their day. Nobody posing or looking at
> the camera.
>
> Avoid: legible text of any kind (signs, lettering on buildings or vehicles,
> number plates); keep signs blank or out of focus. No logos, no coats of arms,
> no real or recognisable places or landmarks. No drone or fisheye shots, no
> HDR, no dramatic skies, no heavy filters, nothing that looks illustrated or
> rendered.
>
> Format: landscape 3:2, at least 2400 × 1600 px. The website also crops them to
> a wide 5:2 strip, so keep the subject within the middle three fifths of the
> height: the top and bottom fifth may be cut.

Then one line per image, only what it shows, e.g. `town-hall`: "the town hall, a
historic building in the old town near the lake", or `building-profiles`:
"profile poles (Bauprofile) marking a planned building on a plot".
