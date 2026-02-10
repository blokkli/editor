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

## NO `<style>` TAGS !!

You **CAN NOT** use `<style>` tags in Vue components! All the CSS of the editor
is in separate css files in `./css` of the repository root. Since this Nuxt
module is installed in all kinds of setups, these styles could potentially leak
into the project's styling.
