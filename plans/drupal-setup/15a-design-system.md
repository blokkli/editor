# 15a: Design system

- **Status:** done (2026-09-27)
- **Milestone:** M1 Local dev site
- **Depends on:** 06, 14a

## Goal

The demo's design foundation, in Nuxt only: a Tailwind theme that replaces the
defaults, fonts, a type scale, colours, layout and responsive rules, the shared
components of the site's shell, and a place to iterate on the design: a design
system page and two mockups.

The source is direction A ("Wappen") of the user's Claude Design canvas
"Blockingen / Bloques – Design System"
(https://claude.ai/artifact/BvCBCL36fZAg4pT8NxZn7e), with mockups of a home, two
overview pages, a detail page and an editorial page. The canvas is a work in
progress, not a spec (the user).

## Tasks

- [x] A Tailwind theme with our own colours, fonts, type scale, containers and
      spacing; Tailwind's default colours, sizes, fonts, radii, shadows and
      container sizes removed.
- [x] Self-hosted fonts: Source Serif 4 and Source Sans 3.
- [x] Icons through `nuxt-svg-icon-sprite`.
- [x] Shared components: logo, header, footer, breadcrumb, callout, link list,
      search field.
- [x] `/<lang>/design-system`: the design system, and the mockups `home` and
      `detail`.
- [x] The existing components migrated to the tokens (no redesign).

## Acceptance criteria

- No default Tailwind colour, size or radius is left in `playground-drupal`.
- The three pages work at 390, 768, 1024 and 1440 px, with the keyboard.
- Every text colour passes WCAG AA on its ground.
- The real pages and the editor still work.

## Decisions (the user, 2026-09-27)

1. Nuxt only: no new paragraph types, no changes to paragraphs in Drupal.
2. Our own Tailwind config, with the default colours removed.
3. The work happens in a design-system pages folder: one page is the design
   system, two are mockups (home and a detail page).
4. The canvas is a work in progress, not a must.
5. The name stays **Blockingen / Bloquens** (14a), not the canvas's "Bloques".
6. The mockups' copy is German, as in the canvas.
7. Parts that aren't paragraph types yet (info and warning boxes, steps, quick
   links, the "Heute" row, the table of contents) are in the mockups, unmarked.

## As built

### Theme (`playground-drupal/app/assets/css/main.css`)

- **Resets:** `--color-*`, `--text-*`, `--font-*`, `--radius-*`, `--shadow-*`
  and `--container-*` are `initial`, first in `@theme`. Spacing, font weights
  and breakpoints stay Tailwind's (sm 640, md 768, lg 1024, xl 1280).
- **Token names never reuse Tailwind's defaults.** The editor's CSS
  (`src/runtime/editor/css/output.css`) declares `--text-xs…6xl`,
  `--font-weight-*`, `--container-2xl/3xl`, `--radius-md/lg/xl`, `--tracking-*`
  and `--leading-*` unlayered on `:root`, which beats the app's `@layer theme`
  while editing and previewing. For the same reason templates use no
  `tracking-*`/`leading-*` utilities: the text tokens carry both.
- **Colours** (semantic):
  - base: `white`, `ink`, `muted`, `line`, `surface`
  - brand: `primary`, `primary-dark`, `primary-light`
  - status: `info`, `success`, `warning` and `error`, each with a `-light`
    ground
  - the footer: `on-dark`, `on-dark-muted`, `on-dark-line`
  - The lowest text/ground pair is 5.28:1 (warning on warning-light); all pass
    AA.
- **Type:** `text-h1` (34 → 56 px), `h2` (26 → 32), `h3` (19 → 21), `lead` (19 →
  22), `body` (17 → 18), `small` (15), `label` (14, uppercase in use).
  - Fluid with `clamp()` between a 375 and a 1440 px viewport.
  - Line height, weight and tracking are in the tokens.
  - The family is a class: `font-serif` for h1, h2, lead and names.
- **Fonts:** `@fontsource-variable/source-serif-4` (`opsz.css`, weight and
  optical size) and `@fontsource-variable/source-sans-3` (`wght.css`,
  `wght-italic.css`), root devDependencies in Nuxt's `css`. No request to
  Google.
- **Layout:**
  - Spacing tokens: `gutter` (16 / 32 / 48 px), `grid` (16 / 24 / 32) and
    `section` (40 / 56 / 64). They are made responsive in `@layer base` with
    `:root { @variant md { … } }`; utilities reference the variables, so plain
    `@theme` (not `inline`) is required. `flow` is 32 px.
  - Containers: `container-content` (48rem) and `container-wide` (75rem) plus
    the gutter on both sides. At 1440 px the wide container leaves the canvas's
    120 px of margin. [15b](15b-apply-design.md) made `container-content` the
    content column, aligned to the left.
  - `band`: a `surface` background as wide as the window behind an element in a
    container, through a pseudo-element; the mockup's `<main>` has
    `overflow-x-clip`. Used by the home page's hero and the detail page's
    header.
- **Base, scoped to `.bk-main-canvas`:** hyphenation
  (`hyphenate-limit-chars: 12 5 5`, so names like "Blockingen" stay whole), the
  focus ring (3 px `info`; white inside `on-dark`) and `::selection`. The
  editor's UI is teleported outside the canvas and doesn't reset these.
- **`@layer components`:**
  - `.button` with `.is-secondary` and `.is-on-dark`
  - `.rich-text`
  - `.page-body`
  - Unlayered CSS would beat the utilities.

### Components (`playground-drupal/app/components/`)

- `Logo`: the shield with six blocks, `negative` for the red and ink grounds.
- `PageHeader`: the skip link, a service bar with the language switch, the logo,
  the main navigation and a search toggle; below `lg` a menu panel.
- `PageFooter`: logo, address and column slots, the bottom row.
- `Breadcrumb`, `Callout` (info, success, warning, error), `LinkList` (links or
  downloads with meta), `SearchField` (two sizes).
- `LanguageSwitch` now inherits its colour (light and dark grounds).
- `DesignSystem/Mockup` (the shell with the mockups' German navigation and
  footer) and `DesignSystem/Placeholder` (striped image placeholders): for the
  mockups only.
- The components' UI strings go through `$texts` (contexts `header`, `search`,
  `breadcrumb`, `callout`). DE and FR are in `drupal/content/texts.csv`.

### Pages (`playground-drupal/app/pages/[lang]/design-system/`)

- `index.vue` is the design system. It's English documentation, not site UI, so
  it uses no `$texts`. It covers:
  - principles, logo, colours
  - type: the scale and a rich-text sample
  - layout and icons
  - the components
- `home.vue` and `detail.vue` are the mockups, with German copy in `lang="de"`.
- The language prefix keeps the UI strings and the language switch working.
  There's no GraphQL, so the pages render for anonymous users too, with English
  defaults.

### The existing frontend

- **Every default class is mapped to a token,** without a redesign.
  - Section's `stone`/`lake` backgrounds are now `surface` and `info-light`,
    with matching swatch hex values in `drupal/blokkli-options-schema.json`.
  - The Button paragraph uses `.button`.
- **The editor's grid overlay** (`getGridMarkup`) shows the real grid:
  `container-wide`, 12 columns and `gap-grid`.

## Verification (2026-09-27)

- **Daemon:** `ddev nuxt restart` with a clean log;
  `typecheck:playground-drupal` is clean.
- **Leftover defaults:** a grep finds no default colour, size, radius or
  container class. The served CSS has only our colour and text tokens.
- **Browser, logged in:**
  - The three pages render without console errors at 390, 768, 1024 and 1440 px
    (no horizontal overflow).
  - With the keyboard, the skip link, the menu and the search toggle work, and
    the focus ring shows.
  - Both fonts load. UI strings are German under `/de` and French under `/fr`.
- **Real pages:** a page, a news item, an event and an office (EN, DE) render.
  - The editor loads, and its UI is unaffected.
  - The grid overlay has 12 columns with a 32 px gap.

## Notes

- **The canvas's other mockups** (the overview pages on levels 1 and 2, the
  editorial "850 Jahre Blockingen") aren't built; they come with 15b and 15c.
- **The detail page's layout** (iterated with the user, 2026-09-27):
  - The header (breadcrumb, eyebrow, title, lead, responsibility) sits on a
    `surface` band as wide as the window.
  - The sidebar is a white panel cut into the band. Its contact section is on
    the white, not in a box.
  - Content and sidebar split 8/4 from `lg`: about 790 and 380 px at 1440, and
    about 80 characters a line.
- **The small logo:** the canvas has a simplified 16 px variant (one square).
  The component has only the full shield.
