---
description:
  Reference for the blökkli editor CSS and Tailwind setup with custom spacing,
  colors, and z-index — use this before writing any styles
---

# Styles Skill

The blökkli editor uses a **fully custom Tailwind CSS configuration** that
**replaces** most Tailwind defaults. Standard Tailwind utility classes like
`p-4`, `text-gray-500`, `gap-6`, `w-96`, or `text-blue-600` **do not exist**.
Always consult this reference before writing CSS or Tailwind classes.

## Critical: What Does NOT Exist

The following common Tailwind defaults are **not available**:

- **No default colors**: No `gray`, `blue`, `green`, `red-500`, `slate`, `zinc`,
  `neutral`, `stone`, `emerald`, `indigo`, `violet`, `pink`, etc.
- **No default spacing scale**: No `1` = 0.25rem, `4` = 1rem, `6` = 1.5rem, `8`
  = 2rem, `12` = 3rem, `16` = 4rem, `64` = 16rem, `96` = 24rem, etc. Spacing
  values are **pixel-based integers** (see below).
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
0, 1, 2, 3, 5, 8, 10, 15, 18, 20, 24, 25, 30, 40, 50, 60, 70, 80, 90,
100, 120, 200, 300, 340, 770
```

All values are in **pixels** (e.g., `p-10` = `10px`, `w-300` = `300px`).

### Dynamic spacing variables

```
offset-t, offset-r, offset-b, scrollbar, sidebar-right, toolbar-left
```

**Wrong**: `p-4` (no 4), `gap-6` (no 6), `w-96` (no 96), `mt-16` (no 16),
`mb-12` (no 12), `px-3.5` (no decimals)

For values not in the scale, use Tailwind arbitrary values: `p-[7px]`,
`w-[250px]`, `gap-[12px]`.

## Border Width

`border` (1px default), `border-0`, `border-2`, `border-3`, `border-4`

## Border Radius

Uses **Tailwind defaults** (not customized).

## Box Shadow

Standard: `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`,
`shadow-2xl`, `shadow-inner`, `shadow-none`

Custom: `shadow-xl-inverted`, `shadow-xl-left`, `shadow-xl-even`

## Z-Index

Uses semantic names defined in `tailwind.config.js` — never use numeric z-index
values like `z-10` or `z-[9999]`. Always use `z-{name}` (e.g., `z-sidebar`,
`z-dialog`, `z-overlay`). Check `tailwind.config.js` for the full list.

## Other Utilities

- **Fonts**: `font-sans` (PB Inter), `font-mono` (monospace). No `font-serif`.
- **Easing**: `ease-swing` (custom cubic-bezier) in addition to Tailwind
  defaults
- **Breakpoints**: Tailwind defaults (`sm`, `md`, `lg`, `xl`, `2xl`)
- **Custom variant**: `mobile-only:` (max-width: 640px)

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

Reusable component styles in `css/components/`:

- `button.css` — `.bk-button` with variants: `.is-primary`, `.is-teal`,
  `.is-orange`, `.is-lime`, `.is-lime-outline`, `.is-danger`, `.is-warning`,
  `.is-small`, `.is-icon`
- `toggle.css` — `.bk-toggle` switch component
- `pill.css` — `.bk-pill` badge/tag component

## Theme System

Themes are JSON files in `src/build/themes/` (nuxt, fire, gruvbox) that define
RGB values for color CSS custom properties as `--bk-theme-{palette}-{shade}`.
