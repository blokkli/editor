# Security

blökkli renders content from many people: titles, texts, comments, pasted
markup, machine translations and the agent's replies. This page says what the
editor does with it, what your components have to do, and which
Content-Security-Policy the editor works under.

## Rendering content

### Text and rich text

Render text as text, with <span v-pre>`{{ }}`</span>: titles, leads, labels, alt
texts and every other value without markup.

```vue
<template>
  <h1 v-blokkli-editable:title>{{ title }}</h1>
</template>
```

Use `v-html` only for rich text that your backend has filtered for the public
site, such as the `processed` value of a formatted text field in Drupal. Apart
from its previews while editing (below), blökkli doesn't sanitise what your
components render: a title rendered with `v-html` is markup that anyone who may
edit the title can write.

To mark up parts of a text, split it and render the parts in the template:

```vue
<template>
  <h1>
    <template v-for="(part, i) in parts" :key="i">
      <em v-if="part.emphasized">{{ part.text }}</em>
      <template v-else>{{ part.text }}</template>
    </template>
  </h1>
</template>

<script setup lang="ts">
const props = defineProps<{ title: string }>()

// Words between $ symbols are emphasized.
const parts = computed(() =>
  props.title
    .split('$')
    .map((text, i) => ({ text, emphasized: i % 2 === 1 }))
    .filter((part) => part.text),
)
</script>
```

### While editing

The editor shows a change before it's saved: it writes the new value into the
element of [`v-blokkli-editable`](/define-blokkli/editable), into the prop the
field is mapped to, or into the slot of
[`<BlokkliEditable>`](/components/BlokkliEditable).

- **Formatted fields** (the `markup` and `frame` types): the value is sanitised
  first. Scripts, event handlers, URLs that run (`javascript:`), SVG, MathML,
  style elements and form controls are removed; classes and data attributes
  stay. The stored value and the proposed changes keep their markup: filtering
  them is your backend's job, as for any other edit.
- **Plain fields** (the `plain` type): the value is what the user typed. The
  editor writes it into an element as text. A prop or a slot gets it as a
  string: render it with <span v-pre>`{{ }}`</span>.
- **Diffs** (a translation, the agent's changes): the editor writes the diff
  into the element as markup, with `<ins>` and `<del>`, sanitised.

### Markup from your code

The editor renders some of the strings your code gives it as HTML. Escape what
you put into them from content:

- the descriptions of an [analyzer's](/adapter/getAnalyzers) results and nodes;
- the strings of [`mapDiffProps`](/define-blokkli/editor#mapdiffprops), which
  the editor also sanitises;
- tour texts (`tourText`) and the descriptions of add actions;
- the [grid overlay's markup](/adapter/getGridMarkup);
- the `message` of a violation in the publish dialog, which the editor also
  sanitises. The Drupal module's are escaped markup.

Labels and descriptions that site admins write (block types, fields) are text.

### Embeds

The [iframes module's](/modules/iframes/setup) editor frames a block's source
only if it's an `http:` or `https:` URL. `<BlokkliIframe>` passes the source to
the editor and frames nothing itself: your own `<iframe>` in its slot loads it
on the page, so check the source there too.

`<BlokkliIframe>` sets the heights in a stylesheet. On a page rendered on the
server, that's a style element in the head, which needs the page's nonce:
[nuxt-security](#nuxt-security) adds it. In the browser, it's a constructable
stylesheet, which the policy doesn't restrict.

## Content-Security-Policy

The editor works under a strict policy: scripts only with the page's nonce, no
inline styles, no `eval`, and Trusted Types. blökkli's sandbox (`sandbox/` in
its repository) sends this policy with every page of its frontend, and its
end-to-end tests run under it against a production build, failing on any
violation.

```
default-src 'none';
script-src 'nonce-…' 'strict-dynamic';
script-src-attr 'none';
style-src 'self' 'nonce-…';
img-src 'self' blob: https://i.ytimg.com;
font-src 'self';
connect-src 'self';
frame-src 'self';
media-src 'self';
manifest-src 'self';
form-action 'self';
frame-ancestors 'self';
base-uri 'none';
object-src 'none';
require-trusted-types-for 'script';
trusted-types vue dompurify blokkli default;
upgrade-insecure-requests
```

What the editor needs:

- **`script-src`:** the editor brings no inline scripts of its own and no event
  handler attributes. Nuxt's nonce and `'strict-dynamic'` cover its chunks.
- **`style-src`:** the editor's stylesheet loads from your app. The styles it
  sets at runtime go through the CSSOM, which the policy doesn't restrict, so it
  needs no `'unsafe-inline'`. Nuxt's own style elements need the nonce.
- **`img-src`:** `blob:` for the previews of uploads and pasted images.
  `https://i.ytimg.com` for the thumbnail of a pasted YouTube link; without it,
  the item shows the provider's icon instead.
- **`connect-src`:** the editor's requests go to your Nuxt app. `'self'` covers
  the [agent's](/modules/agent/quick-start) WebSocket on the same origin.
- **`frame-src`:** the editor frames the forms and the rich text editor of your
  backend. Add its origin if it isn't the frontend's. The same goes for
  `img-src` and `media-src`, if your backend serves the files.
- **No `eval`:** the agent module sets zod's `jitless` mode when the app starts,
  so zod doesn't compile schemas with `new Function`. That's zod's global
  setting, so your own zod schemas on the client run without compiling too.

### Trusted Types

The editor's markup goes through its own policy, `blokkli`. Its dependencies
pass strings to the DOM, which only a `default` policy can take:

- TipTap parses the content of the comment editor;
- turndown parses the markup it converts to Markdown, wrapped in an element of
  its own, `<x-turndown>`;
- ECharts empties the element of a chart (`innerHTML = ''`).

Allow `vue` for Vue's `v-html` and `blokkli` for the editor's, and define the
`default` policy, for example with DOMPurify (which creates a policy named
`dompurify`). `window.trustedTypes` is typed by `@types/trusted-types`.

```ts [app/plugins/trustedTypes.client.ts]
import DOMPurify from 'dompurify'

export default defineNuxtPlugin(() => {
  window.trustedTypes?.createPolicy('default', {
    // turndown looks its element up again: keep it.
    createHTML: (html) =>
      DOMPurify.sanitize(html, { ADD_TAGS: ['x-turndown'] }),
  })
})
```

### nuxt-security

The sandbox gets its policy from
[nuxt-security](https://nuxt-security.vercel.app) in strict mode. nuxt-security
adds a nonce per response to the header and to the tags of the rendered page:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['nuxt-security', '@blokkli/editor'],

  security: {
    strict: true,
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'none'"],
        'script-src': ["'nonce-{{nonce}}'", "'strict-dynamic'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", "'nonce-{{nonce}}'"],
        'img-src': ["'self'", 'blob:', 'https://i.ytimg.com'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-src': ["'self'"],
        'media-src': ["'self'"],
        'manifest-src': ["'self'"],
        'worker-src': false,
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'base-uri': ["'none'"],
        'object-src': ["'none'"],
        'require-trusted-types-for': "'script'",
        'trusted-types': ['vue', 'dompurify', 'blokkli', 'default'],
        'upgrade-insecure-requests': true,
      },
    },
  },

  routeRules: {
    // The editor's requests carry markup: texts, comments, imports and the
    // agent's prompts.
    '/api/graphql_middleware/**': { security: { xssValidator: false } },
    '/api/blokkli/agent/**': { security: { xssValidator: false } },
  },
})
```

- **The XSS validator** answers 400 to any request with markup that its filter
  would change. The editor's GraphQL operations and the agent's messages carry
  markup, so turn it off for their routes.
- **The rate limiter** counts requests per IP address. Behind a proxy, every
  request may come from the proxy's address, and all users then share one limit.
  The sandbox turns it off.
- **Strict mode** also sends `Cross-Origin-Embedder-Policy: require-corp`: see
  [Framing](#framing).

### During development

Nuxt's devtools and its error overlay need inline styles and pass strings to the
DOM. A looser policy on the dev server keeps them working: styles with
`'unsafe-inline'` and without the nonce (a nonce makes browsers ignore
`'unsafe-inline'`), and no Trusted Types. Test the strict policy against a
production build.

### Framing

The editor frames your backend's pages. A frontend that sends a
`Cross-Origin-Embedder-Policy` can only frame pages that send one too. The
Drupal module sends `Cross-Origin-Embedder-Policy: credentialless` with the
pages the editor frames. Change it in your site's `services.yml`:

```yaml
parameters:
  # "credentialless", "require-corp", or false for none.
  paragraphs_blokkli.frame_embedder_policy: require-corp
```

- **`require-corp`** for a frontend that sends it, such as nuxt-security's
  strict mode. Safari doesn't know `credentialless` and blocks those frames
  under `require-corp`. The framed pages' resources from other origins (images
  from a CDN, for example) then need a `Cross-Origin-Resource-Policy` header.
- **`false`** if your web server or CDN already adds the header to these pages:
  browsers read two headers, even with the same value, as none.

A backend on another origin than the frontend also has to send
`Cross-Origin-Resource-Policy: cross-origin` with these pages, and allow the
frontend to frame them: Drupal core sends `X-Frame-Options: SAMEORIGIN`.

### Drupal

The Drupal module's pages work under a policy of their own: scripts and styles
from the site only, nothing inline. The
[csp](https://www.drupal.org/project/csp) module sends one. The sandbox's:

```
default-src 'none'; script-src 'self'; style-src 'self';
img-src 'self' data:; font-src 'self'; connect-src 'self';
frame-src 'self'; media-src 'self'; manifest-src 'self';
worker-src 'self'; object-src 'none'; base-uri 'none';
form-action 'self'; frame-ancestors 'self'
```

- **`frame-ancestors`** has to allow the frontend.
- **CKEditor 5** needs inline styles. The csp module adds `'unsafe-inline'` to
  `style-src` on the pages that load it.
- **`img-src data:`** is for the icons of the Claro and Gin themes.
- **Drupal core's htmx** adds a style element for its indicators, which the
  policy blocks. Core doesn't use the indicators, so turn them off. htmx reads
  its configuration from a meta tag, which a hook class can add:

```php
#[Hook('page_attachments')]
public function pageAttachments(array &$attachments): void {
  $attachments['#attached']['html_head'][] = [
    [
      '#tag' => 'meta',
      '#attributes' => [
        'name' => 'htmx-config',
        'content' => '{"includeIndicatorStyles":false}',
      ],
    ],
    'mymodule_htmx_config',
  ];
}
```

Trusted Types don't work on Drupal's pages: core's jQuery and htmx, CKEditor 5
and Gin pass strings to the DOM.
