# Hydration

On a page that Nuxt renders on the server, every block hydrates with the page:
the browser downloads its code, runs its setup, renders it and attaches its
event listeners. A block that doesn't need this, or not right away, says so with
`hydrate` in `defineBlokkli()` or `defineBlokkliFragment()`:

```vue
<script lang="ts" setup>
defineBlokkli({
  bundle: 'text',
  hydrate: 'never',
})
</script>
```

Until the block hydrates, the browser keeps the HTML from the server, and
neither downloads nor runs the block's code. On pages with many static blocks,
this makes the hydration cheaper.

| Value     | The block hydrates                                       |
| --------- | -------------------------------------------------------- |
| `never`   | never: it stays as the server rendered it                |
| `visible` | when it enters the viewport                              |
| `idle`    | when the browser is idle, at the latest after 10 seconds |

Without `hydrate`, the block hydrates with the page. Like `chunkName`, the value
is read at build time, so it must be a literal. It applies to one component
file: a [`renderFor`](/define-blokkli/render-for) variation can have a value of
its own, or none.

## How it works

blökkli uses Nuxt's
[lazy hydration](https://nuxt.com/docs/4.x/api/utils/define-lazy-hydration-component),
which builds on Vue's (`defineAsyncComponent({ hydrate })`). A block with
`hydrate`:

- **gets a chunk of its own,** which the browser downloads when the block
  hydrates: for `never`, never. So the block can't have a `chunkName` (the build
  fails). It only gets a chunk of its own when nothing else imports its
  component.
- **isn't in the page's modulepreload links.** A `never` block isn't in its
  prefetch links either. The chunk of a `visible` or `idle` block can still be
  prefetched (downloaded at a low priority, not run), depending on how the
  bundle is split.
- **with `never`, and Nuxt's `experimental.stripNeverHydratedData`** (Nuxt 4.6
  and later): what `useAsyncData()` fetched in the block, or in the blocks
  inside it, isn't in the page's payload.

## Where it applies

Only on a page that Nuxt renders on the server and then hydrates. Everywhere
else the block renders as usual:

- **In the editor:** the editor renders in the browser, with its own copies of
  the components.
- **In a preview, after a navigation in the browser, and in a `v-if` that turns
  on in the browser:** there's no HTML from the server to keep. The block's
  chunk loads first, then the block renders.
- **With `ssr: false`:** blökkli ignores `hydrate`. The block is then in the
  default chunk group: a large block that only a few pages have is better off
  with a `chunkName` in such a project.
- **With Nuxt's `experimental.lazyHydration: false`:** blökkli ignores
  `hydrate`, and the build warns about it.

The `from_library` and `blokkli_fragment` blocks hydrate with the page. The
block of a library item and the component of a fragment follow their own
definition.

## What to look out for

- **The blocks inside wait.** The blocks in a `<BlokkliField>` of the block
  hydrate with it: inside a `never` block, never. A nested block's own `hydrate`
  applies once its parent has hydrated. On a container, the value applies to
  everything in it.
- **Until it hydrates, nothing in the block runs:** no event handlers, no
  `onMounted()`, no content of `<ClientOnly>`. A `<NuxtLink>` is a plain link: a
  click loads the whole page. The block's HTML doesn't follow what changes in
  the browser (its options, the route, a store), and text typed into a form
  field is reset when the block hydrates.
- **Not for what users reach for first.** A click on a `visible` block right
  after it has scrolled into view is lost while its chunk loads. A `visible`
  block in the first viewport hydrates with the page, which then waits for the
  block's chunk: it wasn't preloaded.
- **Fetching data.** Nuxt reads the payload only while the page hydrates. A
  block that hydrates later runs its `useAsyncData()` (or `useFetch()`,
  `useAsyncGraphqlQuery()`) again in the browser: without `await`, its first
  render has no data and doesn't match the HTML; with `await`, its hydration
  waits for the request. A `getCachedData` that reads the payload avoids it. Its
  key must be the block's own:

  ```typescript
  const { uuid } = defineBlokkli({
    bundle: 'teaser_list',
    hydrate: 'visible',
  })

  const { data } = await useAsyncData(`teasers:${uuid}`, fetchTeasers, {
    // The block may hydrate after the page: read what the server fetched.
    getCachedData: (key, nuxtApp, { cause }) =>
      cause === 'initial' ? nuxtApp.payload.data[key] : undefined,
  })
  ```

  nuxt-graphql-middleware does this for `useAsyncGraphqlQuery()` with its client
  cache (`graphqlCaching: { client: true }`).

- **`useHead()`:** until the block hydrates (with `never`, ever), the browser
  doesn't know the tags it set on the server. A title or meta tag that it
  overrides switches back to the page's, and a tag that only the block adds
  stays after a navigation.
- **Teleports:** Vue hydrates the teleports of one target in order, and a block
  that doesn't hydrate shifts the others. A block with `hydrate` must not render
  a `<Teleport>` on the server.
- **A changed prop replaces the HTML:** when a prop of the block changes before
  it hydrates, Vue renders the block in the browser instead (in dev with the
  warning "Skipping lazy hydration"), and it's empty until its chunk has loaded.
  In blökkli, that's when the page's data is fetched again and a block keeps its
  uuid.
- **Only the block's own script waits.** Its CSS is on the page. Components that
  it renders and that have chunks of their own (a `Lazy…` component, for
  example) are still preloaded.
- **`visible`:** the block hydrates when its first pixel enters the viewport,
  without a margin. A hidden root (`v-show`, `display: none`) waits until it's
  shown, and before Vue 3.5.44, a root with `display: contents` never hydrates.
- **`idle`:** Safari doesn't support `requestIdleCallback` (it's behind a flag,
  on macOS and iOS). There, Vue hydrates the block right after the page.
- **Nuxt's `components.transform.exclude`:** a pattern that matches blökkli's
  templates (in `.nuxt/blokkli/`) keeps Nuxt from transforming them, and the
  blocks with `hydrate` render nothing.
- **Nuxt layers:** a block from a layer works. In a project that sets
  `vite.root`, or for a block whose path goes through a symlink, the block's
  chunk is preloaded again. It still hydrates lazily.

## Which value for which block

- **`never`:** static blocks, without event handlers, a `<NuxtLink>` or nested
  blocks: a title, a text, a table, an image.
- **`visible`:** blocks with a lot of code, or that only render in the browser
  (a chart), and interactive blocks that aren't at the top of the page (an
  accordion).
- **`idle`:** blocks that should work soon, but not before the page.
- **Without `hydrate`:** blocks with links to pages of the site (their
  navigation in the browser), and containers whose blocks need different values.

Nuxt's `interaction` strategy isn't available: Vue repeats the click that
triggers the hydration right away, but Nuxt only starts loading the block's code
then, so the first click or key press would be lost.
