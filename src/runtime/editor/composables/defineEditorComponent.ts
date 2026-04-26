import type {
  AllowedComponentProps,
  Component,
  VNodeChild,
  VNodeProps,
} from 'vue'

type AnyComponent =
  | (abstract new (...args: any[]) => any)
  | ((...args: any[]) => any)

type ExtractInstanceProps<C> = C extends abstract new (...args: any[]) => {
  $props: infer P
}
  ? P
  : C extends (props: infer P, ...rest: any[]) => any
    ? P
    : Record<string, never>

/**
 * Extracts the public props of a Vue component, with Vue's built-in keys
 * (`key`, `ref`, `class`, `style`, …) stripped out so only the props the
 * component itself declares — including `modelValue` and `onUpdate:*` — remain.
 */
export type ComponentProps<C> = Omit<
  ExtractInstanceProps<C>,
  keyof VNodeProps | keyof AllowedComponentProps
>

export type EditorComponentVariantSlots = Record<
  string,
  (scope?: any) => VNodeChild | string
>

export interface EditorComponentVariant<TProps extends Record<string, any>> {
  /** Short label shown above the rendered variant. */
  label: string

  /** Optional longer description. */
  description?: string

  /** Props passed to the component, fully typed. */
  props: Partial<TProps>

  /**
   * Slot render functions, keyed by slot name. The default slot is `default`.
   * Each function may return any VNode-compatible value.
   */
  slots?: EditorComponentVariantSlots
}

export interface EditorComponentMeta<C extends AnyComponent = AnyComponent> {
  /** Discriminator — distinguishes from snippet entries. */
  kind: 'component'

  /** Unique identifier (used in URLs / sidebar). */
  id: string

  /** Display name. */
  label: string

  /** Optional category — used to group entries in the styleguide sidebar. */
  category?: string

  /** Optional description shown above the variants. */
  description?: string

  /** The component being documented. */
  component: C

  /**
   * Optional class applied to each variant's stage in place of the default
   * checkerboard. Useful for components that need a solid or themed
   * background to be legible (e.g. white-on-dark).
   */
  backgroundClass?: string

  /** One or more variants demonstrating different prop/slot combinations. */
  variants: EditorComponentVariant<ComponentProps<C>>[]
}

interface EditorSnippetVariantBase {
  /** Short label shown above the rendered variant. */
  label: string

  /** Optional longer description. */
  description?: string
}

interface EditorSnippetVariantRender extends EditorSnippetVariantBase {
  /** Render function returning the VNodes that demonstrate the snippet. */
  render: () => VNodeChild | string
  component?: never
}

interface EditorSnippetVariantComponent extends EditorSnippetVariantBase {
  /**
   * Component that renders the snippet. Use when the example is large enough
   * that a `<template>` is easier to read than a `render()` function.
   */
  component: Component
  render?: never
}

export type EditorSnippetVariant =
  | EditorSnippetVariantRender
  | EditorSnippetVariantComponent

export interface EditorSnippetMeta {
  /** Discriminator — distinguishes from component entries. */
  kind: 'snippet'

  /** Unique identifier (used in URLs / sidebar). */
  id: string

  /** Display name. */
  label: string

  /** Optional category — used to group entries in the styleguide sidebar. */
  category?: string

  /** Optional description shown above the variants. */
  description?: string

  /**
   * Optional class applied to each variant's stage in place of the default
   * checkerboard. Useful for snippets that need a solid or themed background
   * to be legible (e.g. white-on-dark).
   */
  backgroundClass?: string

  /** One or more variants demonstrating different renderings. */
  variants: EditorSnippetVariant[]
}

export type EditorEntry = EditorComponentMeta | EditorSnippetMeta

/**
 * Co-locates metadata for an editor component (currently used by the
 * styleguide feature to render variants). The component's `$props` type
 * drives autocomplete and type checking inside each `variants[].props`.
 *
 * Place this in a `story.ts` file next to the component:
 *
 * ```ts
 * // components/Dropdown/story.ts
 * import { defineEditorComponent } from '#blokkli/editor/composables'
 * import Dropdown from './index.vue'
 *
 * export default defineEditorComponent({
 *   id: 'dropdown',
 *   label: 'Dropdown',
 *   component: Dropdown,
 *   variants: [{ label: 'Default', props: { position: 'bottom-left' } }],
 * })
 * ```
 */
export function defineEditorComponent<C extends AnyComponent>(
  meta: Omit<EditorComponentMeta<C>, 'kind'>,
): EditorComponentMeta<C> {
  return { ...meta, kind: 'component' }
}

/**
 * Declare a non-component entry for the styleguide — typically used to show
 * CSS-only patterns (button variants, pills, shortcuts, …). Each variant
 * provides a `render()` function returning arbitrary VNodes.
 */
export function defineEditorSnippet(
  meta: Omit<EditorSnippetMeta, 'kind'>,
): EditorSnippetMeta {
  return { ...meta, kind: 'snippet' }
}
