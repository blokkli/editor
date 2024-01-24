# Adapter Overview

Since blökkli only provides the editor without handling any data, it's up to the
adapter to actually implement persisting changes.

Currently blökkli ships with an adapter to integrate the editor in a Drupal
paragraphs based setup using GraphQL.

## Defining an adapter

To define an adapter, create a new file in your app root:

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {}
})
```

:::

To extend an existing adapter you can do the following:

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import drupalGraphlMiddlewareAdapter from '#blokkli/adapter/drupal/graphqlMiddleware'

export default defineBlokkliEditAdapter((ctx) => {
  // Create instance of the base adapter.
  const baseAdapter = drupalGraphlMiddlewareAdapter(ctx)
  return {
    ...baseAdapter,

    // Override specific methods from the base adapter.
    getDisabledFeatures() {
      return ['comments']
    },
  }
})
```

:::
