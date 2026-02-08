---
description: Reference for the blökkli editor CSS and Tailwind setup with custom spacing, colors, and z-index — use this before writing any styles
---

# Styles Skill

The blökkli editor uses a **fully custom Tailwind CSS configuration** that
**replaces** most Tailwind defaults. Standard Tailwind utility classes like
`p-4`, `text-gray-500`, `gap-6`, `w-96`, or `text-blue-600` **do not exist**.
Always consult this reference before writing CSS or Tailwind classes.

## Critical: What Does NOT Exist

The following common Tailwind defaults are **not available**:

- **No default colors**: No `gray`, `blue`, `green`, `red-500`, `slate`,
  `zinc`, `neutral`, `stone`, `emerald`, `indigo`, `violet`, `pink`, etc.
- **No default spacing scale**: No `1` = 0.25rem, `4` = 1rem, `6` = 1.5rem,
  `8` = 2rem, `12` = 3rem, `16` = 4rem, `64` = 16rem, `96` = 24rem, etc.
  Spacing values are **pixel-based integers** (see below).
- **No default font families**: No `font-serif`. Only `font-sans` and
  `font-mono`.

## Colors

All colors are theme-driven via CSS custom properties. Only these exist:

### Primary palettes (shades: 50-950)

- `accent-{50,100,200,300,400,500,600,700,800,900,950}` — Brand/primary color
- `mono-{50,100,200,300,400,500,600,700,800,900,950}` — Neutral/gray scale

### Secondary palettes (shades: light, normal, dark)

- `teal-{light,normal,dark}`
- `yellow-{light,normal,dark}`
- `red-{light,normal,dark}`
- `lime-{light,normal,dark}`
- `orange-{light,normal,dark}`

### Scheme colors (contextual, overridable per element)

- `scheme-{light,normal,dark,text}` — Defaults to accent, overridable via CSS
  vars `--bk-scheme-*`

### Utility colors

- `white`, `black`, `transparent`, `current`

### Examples

```
bg-accent-700  text-mono-900  border-red-normal  text-scheme-dark
bg-mono-50     text-accent-50 bg-lime-light      text-white
```

**Wrong**: `bg-gray-100`, `text-blue-500`, `border-red-500`, `bg-slate-200`

## Spacing

Spacing is a **custom pixel-based scale**. These values apply to all spacing
utilities: `p-*`, `m-*`, `gap-*`, `w-*`, `h-*`, `top-*`, `inset-*`, etc.

### Available values

```
0     → 0px
1     → 1px
2     → 2px
3     → 3px
5     → 5px
8     → 8px
10    → 10px
15    → 15px
18    → 18px
20    → 20px
24    → 24px
25    → 25px
30    → 30px
40    → 40px
50    → 50px
60    → 60px
70    → 70px
80    → 80px
90    → 90px
100   → 100px
120   → 120px
200   → 200px
300   → 300px
340   → 340px
770   → 770px
```

### Dynamic spacing variables

```
offset-t      → var(--bk-root-offset-top)
offset-r      → var(--bk-root-offset-right)
offset-b      → var(--bk-root-offset-bottom)
scrollbar     → var(--bk-artboard-scrollbar-size)
sidebar-right → var(--bk-sidebar-width-right)
toolbar-left  → var(--bk-toolbar-left-width)
```

### Examples

```
p-10  gap-5  w-300  h-50  mt-20  px-15  mb-30
top-offset-t  right-offset-r  w-sidebar-right
```

**Wrong**: `p-4` (no 4), `gap-6` (no 6), `w-96` (no 96), `mt-16` (no 16),
`mb-12` (no 12), `px-3.5` (no decimals)

For values not in the scale, use Tailwind arbitrary values: `p-[7px]`,
`w-[250px]`, `gap-[12px]`.

## Border Width

```
border    → 1px (default)
border-0  → 0
border-2  → 2px
border-3  → 3px
border-4  → 4px
```

**Wrong**: `border-8`, `border-[0.5px]`

## Border Radius

Border radius uses **Tailwind defaults** (this is one category that is NOT
customized):

```
rounded-none → 0
rounded-sm   → 0.125rem (2px)
rounded      → 0.25rem (4px)
rounded-md   → 0.375rem (6px)
rounded-lg   → 0.5rem (8px)
rounded-xl   → 0.75rem (12px)
rounded-2xl  → 1rem (16px)
rounded-3xl  → 1.5rem (24px)
rounded-full → 9999px
```

## Box Shadow

```
shadow-sm          shadow             shadow-md
shadow-lg          shadow-xl          shadow-2xl
shadow-inner       shadow-none
shadow-xl-inverted shadow-xl-left     shadow-xl-even
```

## Z-Index

Uses a computed base system: `calc(var(--bk-z-index-base) + N)` where
`--bk-z-index-base` is `50000`.

Available z-index names (use as `z-{name}`):

```
z-main-layout              z-canvas-overlay
z-animation-canvas         z-selection
z-interaction-overlay      z-comments-overlay
z-comments-overlay-active  z-artboard-scrollbar
z-artboard-overview        z-translations-banner-mobile
z-editable-field           z-translations-banner-desktop
z-actions                  z-sidebar
z-sidebar-tabs             z-toolbar
z-selection-add            z-add-buttons-label
z-add-list                 z-add-list-info
z-tour-popup               z-preview
z-toolbar-dropdown         z-drop-targets
z-dragging-overlay         z-touch-action-bar
z-tour-overlay             z-tour-item
z-context-menu             z-search
z-resizable                z-transform-overlay
z-overlay                  z-sidebar-detached
z-form-overlay             z-form-overlay-header
z-dialog                   z-messages
z-menu                     z-command-palette
z-library-edit-dialog      z-nested-editor-overlay-bg
z-nested-editor-overlay-iframe  z-init-overlay
```

**Wrong**: `z-10`, `z-50`, `z-[9999]` — always use semantic z-index names.

## Font Family

```
font-sans  → 'PB Inter, sans-serif'
font-mono  → 'monospace'
```

**Wrong**: `font-serif`

## Transition Timing

Standard Tailwind easings plus:

```
ease-swing → cubic-bezier(0.56, 0.04, 0.25, 1)
```

## Breakpoints

Breakpoints use Tailwind defaults:

```
sm  → 640px
md  → 768px
lg  → 1024px
xl  → 1280px
2xl → 1536px
```

## Custom Variant

```
mobile-only:  → @media screen and (max-width: 640px)
```

## CSS Architecture

- Entry point: `css/index.css`, partials in `css/partials/`
- Output: `src/runtime/editor/css/output.css`
- Build: `npm run styles:build` — but the developer always has
  `npm run styles:watch` running, so changes are picked up automatically. Only
  use `styles:build` to verify that CSS changes compile without errors, not to
  apply them.
- All CSS is **scoped to `.bk`** container via PostCSS replace plugin
- `rem` units are converted to `px` (base 16px) during build
- Tailwind preflight is **disabled** — custom preflight in
  `css/partials/preflight.css`
- Tailwind `--tw-*` variables are renamed to `--bk-tw-*`

## Component CSS Classes

Reusable component styles are defined in `css/components/`:

- `button.css` — `.bk-button` with variants: `.is-primary`, `.is-teal`,
  `.is-orange`, `.is-lime`, `.is-lime-outline`, `.is-danger`, `.is-warning`,
  `.is-small`, `.is-icon`
- `toggle.css` — `.bk-toggle` switch component
- `pill.css` — `.bk-pill` badge/tag component

## Theme System

Themes are JSON files in `src/build/themes/` (nuxt, fire, gruvbox) that define
RGB values for all color CSS custom properties. Colors are set as
`--bk-theme-{palette}-{shade}` with space-separated RGB values (e.g.,
`0 220 130`).
