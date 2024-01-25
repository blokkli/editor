# changeLanguage()

This method should change the current language.

The method is called when translations are enabled and the user switches to a
different language via the language selector in the editor.

## Example (language via URL)

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { EntityTranslation } from '#blokkli/types'

export default defineBlokkliEditAdapter((ctx) => {
  const router = useRouter()
  return {
    changeLanguage: (translation: EntityTranslation) => {
      return router.replace(translation.url)
    },
  }
})
```

:::

## Example (language via global state)

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { EntityTranslation } from '#blokkli/types'

export default defineBlokkliEditAdapter((ctx) => {
  const language = useCurrentLanguage()

  return {
    changeLanguage: (translation: EntityTranslation) => {
      // Update the language via our global state variable.
      language.value = translation.id

      return Promise.resolve()
    },
  }
})
```

:::
