# Tailwind

blökkli's editor UI is built with a fully custom Tailwind configuration — custom
spacing, colors, and z-index scales rather than Tailwind's defaults. The
tailwind module exposes that configuration so your project and your custom
modules can reuse the same design tokens.

## Reusing blökkli's tokens in your project

The module's default export is a Tailwind config object, loaded through Tailwind
v4's `@config` directive. Reference it from a CSS file in your own app:

```css
@config '@blokkli/editor/tailwind';

@import 'tailwindcss';
```

This makes blökkli's custom tokens available as utility classes in that CSS
scope — useful when you want block components or surrounding layout to line up
visually with the editor.

### What it provides

- **Spacing** — blökkli's custom spacing scale.
- **Colors** — blökkli's color palette (e.g. `accent-*`, `mono-*`).
- **Z-index** — the layered z-index values the editor relies on.

::: warning

This config **replaces** Tailwind's defaults, so standard classes like `p-4`,
`text-gray-500`, or `gap-6` may not exist or may map to different values. Use
the tokens defined by the config. See the editor's
[styling concepts](/editor/themes) for background on the design system.

:::

## Registering CSS with the editor

A [custom blökkli module](/modules/authoring/) can inject its own CSS into the
editor's stylesheet — for example to style a custom complex-option editor or
other editor UI. Register a CSS file from the module's `setup` with
`context.addCSS()`:

```typescript
import { createResolver } from '@nuxt/kit'
import { defineBlokkliModule } from '@blokkli/editor/modules'
import { fileURLToPath } from 'node:url'

const resolve = createResolver(
  fileURLToPath(new URL('./', import.meta.url)),
).resolve

export default defineBlokkliModule({
  setup({ context }) {
    // Inject a CSS file into the editor's stylesheet.
    context.addCSS(resolve('./build/my-editor.css'))

    // Include Tailwind utilities used in this module's Vue templates.
    context.addContentPath(resolve('./app/my-editor'))
  },
})
```

Registered CSS goes through blökkli's CSS build pipeline:

- **`@config` is injected automatically.** The build prepends
  `@reference 'tailwindcss'` and `@config '<editor config>'` to each registered
  file, so you do **not** write them yourself. (If the file declares its own
  `@reference` or `@config`, injection is skipped and your directives are used.)
- **Class names are mangled and scoped to `.bk`.** The output is scoped to the
  editor, so it won't leak into the rest of your app.

That means a registered CSS file can use `@apply` with blökkli's tokens and
`.bk`-prefixed selectors directly:

```css
@layer base {
  .bk-my-editor {
    .bk-panel-item.bk-is-hidden {
      @apply opacity-30;
    }

    label {
      @apply flex items-center rounded border-2 border-mono-200 text-mono-500;

      &:has(input:checked) {
        @apply bg-accent-700 border-accent-700 font-bold text-white;
      }
    }
  }
}
```

### `addCSS` vs `addContentPath`

- **`context.addCSS(filePath)`** — register a standalone CSS file (absolute
  path). Use it for hand-written editor styles.
- **`context.addContentPath(dirPath)`** — register a directory of Vue components
  so the Tailwind utility classes used in their templates are generated and
  included (and their template classes and `<style>` blocks are mangled and
  scoped). Use it so utility classes in your module's components actually appear
  in the editor output.

## Notes

- The `@config '@blokkli/editor/tailwind'` form (first section) is for your
  project's **own** CSS pipeline. CSS registered via `context.addCSS()` (second
  section) targets the **editor's** stylesheet and gets `@config` injected for
  you.
- The tailwind module itself adds no runtime behaviour and registers no
  components; it only exposes the config object.
