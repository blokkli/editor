---
description: Rules when creating or editing Vue components
---

# Nuxt + Vue Developer

## General

- There are NO auto-imports, so all composables **MUST** be imported from
  `#imports`
- **ALWAYS** use `useTemplateRef` when referencing elements or components from
  `<template>`!!
- Prefer passing primitives as props for components that deal with exactly one
  type, for example: `defineProps<MyItemType>()` instead of
  `defineProps<{ item: MyItemType }>()` or
  `defineProps<{ title: string; text: string }>()`. The parent can then use
  `<MyComponent v-bind="item" />` to spread the properties of the type as props.

## Component File Structure

- Generally: Components should always be `index.vue` in a folder, e.g.
  `MyComponent/index.vue` instead of `MyComponent.vue`.
- Component can and should be nested. Because there are no auto-imports, the
  components need to be imported as needed.

## Using watchers

Watchers can create hard to understand code flow and there is almost always a
better way to implement that. You need a very good reason to be using watchers.
If a watcher is really needed, prefer usign `watch` over `watchEffect`.

## Excessive `defineExpose` usage

Exposing component internals via `defineExpose` is often a symptom of an
underlying architecture problem and can be seen as a "dirty workaround". There
are valid use cases, so doing that is not forbidden, but it needs a very good
reason.

## Props

- Prefer using props over `provide`/`inject`. Dependency injection should
  **ONLY** be used for truly "global" objects or state, such as `useBlokkli`.
- Prefer using shorthand syntax for passing props: so
  `<MyComponent :can-submit />` instead of
  `<MyComponent :can-submit="canSubmit" />`!

## Styling Components

### Utility classes in templates (preferred)

Use Tailwind utility classes directly in `class="..."` attributes for simple
styles. A build-time mangling system renames them (e.g., `flex` → `_bk_flex`) so
they never collide with host project styles. See the **styles** skill for the
available Tailwind config (custom spacing, colors, etc.).

### `<style lang="postcss">` blocks

Use `<style lang="postcss">` for CSS that can't be expressed as utility classes:
complex selectors, container queries, pseudo-elements, styling `v-html` content,
etc. These blocks support full `@apply`, `theme()`, and nesting — they are
pre-processed through blökkli's PostCSS pipeline at build time, so consumers
receive plain CSS.

**When to use `<style>` vs utility classes:**

- Simple layout, spacing, colors → utility classes in template
- Nested selectors, pseudo-elements, container queries, `v-html` styling →
  `<style lang="postcss">`
- Selectors in `<style>` should use `bk-*` class names

### `tw()` marker function

When referencing utility class names in `<script>` sections (e.g.,
`classList.add(...)`, computed class strings), wrap them in `tw()` so the
mangling system can find and rename them:

```ts
import { tw } from '#blokkli/helpers/tw'
element.classList.add(tw('flex pt-5'))
```

### Legacy CSS partials

Some components still have their CSS in separate files under `css/partials/`.
When modifying these components, consider migrating the CSS into the component
using utility classes and `<style lang="postcss">`, then removing the `@import`
from `css/index.css`.
