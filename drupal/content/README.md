# Content

The content that `ddev bake` seeds, with `blokkli_playground`'s seed command
(`drush blokkli-playground:seed --source=en`). Every file is checked first;
nothing is created while a file has problems, and each one is reported with its
file and path.

| File               | Entities                                            |
| ------------------ | --------------------------------------------------- |
| `users.yml`        | users (the admin comes from the installation)       |
| `media.yml`        | media, with their files from `files/`               |
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
field_office: { node: town-hall }
field_paragraphs:
  - type: section
    options: { background: stone, columns: 2 }
    field_title: { en: Applying, de: Gesuch einreichen, fr: Déposer une demande }
    field_paragraphs:
      - type: text
        key: counter-text # optional; comments refer to paragraphs by key
        field_text: { en: <p>…</p>, de: <p>…</p>, fr: <p>…</p> }
```

- **Everything but `key`, `type`, `id`, `source`, `options`, `outdated` and
  `frontend_route` is a field.** A field the bundle doesn't have is an error.
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
| entity reference                         | `{ node: key }`, `{ media: key }`, `{ library: key }`, `{ user: key }` (`admin` is uid 1) |
| paragraphs (entity reference revisions)  | a list of paragraphs: `type`, `options`, fields                |
| link                                     | `{ node: key }`, `{ media: key }` (a document), `/internal/path` or `https://…` |
| formatted text                           | the markup; the field's first allowed format is used           |
| image, file                              | `{ file: images/lake.png, alt: … }`, a path in `files/`        |
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

Pages and editorial pages get their URL from their place in the menu.

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

## Placeholders

The images in `files/` are generated placeholders, and the content is the
minimum that uses every paragraph type and host. The demo content (chunk 14b)
replaces them, in the same format.
