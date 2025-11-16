# BlokkliProvider

The `BlokkliProvider` component is the root component that wraps your page
content and enables blökkli editing functionality.

## Usage

```vue
<template>
  <BlokkliProvider
    v-slot="{ entity, isEditing, canEdit, isPreview }"
    entity-type="content"
    entity-bundle="page"
    :entity-uuid="page.uuid"
    :entity="pageData"
    :permissions="['review', 'edit', 'view']"
  >
    <!-- Your page content here -->
    <h1>{{ entity.title }}</h1>
    <BlokkliField name="content" :list="entity.content" />
  </BlokkliProvider>
</template>
```

## Props

### entityType

- **Type:** `string`
- **Required:** Yes

The entity type of the page being edited (e.g., `'content'`, `'node'`,
`'article'`).

### entityBundle

- **Type:** `string`
- **Required:** Yes

The entity bundle (e.g., `'page'`, `'article'`, `'blog_post'`).

### entityUuid

- **Type:** `string`
- **Required:** Yes

The unique identifier (UUID) of the entity being edited.

### entity

- **Type:** `T` (generic type)
- **Required:** No

The entity data object. During editing, this will be merged with mutated data
from the edit state. The component will pass the merged entity to the slot.

### language

- **Type:** `string`
- **Required:** No
- **Default:** `''`

The current language code (e.g., `'en'`, `'de'`, `'fr'`).

### permissions

- **Type:** `Array<EditPermission | null>`
- **Required:** No
- **Default:** `[]`

Array of permissions for the current user. Available permissions:

- `'edit'` - User can edit content
- `'view'` - User can view content
- `'review'` - User can review changes

### editLabel

- **Type:** `string`
- **Required:** No
- **Default:** `''`

Custom label for the edit button that appears when not in edit mode.

### editPath

- **Type:** `string`
- **Required:** No

Custom path to use when opening the editor. By default, uses the current route
path.

### hostOptions

- **Type:** `Record<string, any>`
- **Required:** No

Host options that apply to the entire page. These are defined using
`defineBlokkliProvider()`.

### isolate

- **Type:** `boolean`
- **Required:** No
- **Default:** `false`

When `true`, isolates the provider element during editing by hiding other page
content. Useful for focusing on a specific editable region.

## Slots

### default

The default slot receives the following props:

#### entity

- **Type:** `T`

The entity data, merged with any mutations from the edit state during editing.

#### isEditing

- **Type:** `boolean`

Whether the editor is currently active for this entity.

#### canEdit

- **Type:** `boolean`

Whether the current user has permission to edit.

#### isPreview

- **Type:** `boolean`

Whether the preview mode is active (viewing unpublished changes without the
editor UI).

## Complete Example

```vue
<template>
  <div v-if="page">
    <BlokkliProvider
      v-slot="{ entity, isEditing, canEdit, isPreview }"
      entity-type="content"
      entity-bundle="page"
      :entity-uuid="page.uuid"
      :entity="pageData"
      :language="currentLanguage"
      :permissions="['review', 'edit', 'view']"
      edit-label="Edit this page"
    >
      <article>
        <header>
          <h1>{{ entity.title }}</h1>
          <p v-if="entity.description">{{ entity.description }}</p>
        </header>

        <BlokkliField
          name="content"
          :list="entity.content"
          allowed-fragments="cta"
        />

        <footer v-if="!isEditing">
          <p>Published: {{ entity.publishedDate }}</p>
        </footer>
      </article>
    </BlokkliProvider>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const page = await fetchPage()
const currentLanguage = computed(() => route.params.lang || 'en')

const pageData = computed(() => ({
  title: page.title,
  description: page.description,
  content: page.content,
  publishedDate: page.publishedDate,
}))
</script>
```

## Host Options

You can define page-level options using `defineBlokkliProvider()`:

```vue
<script setup lang="ts">
const { options } = defineBlokkliProvider(pageData.value, {
  entityType: 'content',
  bundle: 'page',
  options: {
    theme: {
      type: 'radios',
      label: 'Page Theme',
      default: 'light',
      options: {
        light: 'Light',
        dark: 'Dark',
      },
    },
  },
})

// Use options in your template
const themeClass = computed(() =>
  options.value.theme === 'dark' ? 'dark-theme' : 'light-theme',
)
</script>
```

## Edit State

The provider automatically handles the edit state based on URL query parameters:

- **Edit mode:** `?blokkliEditing=<entityUuid>`
- **Preview mode:** `?blokkliPreview=<entityUuid>`

When not in either mode, an edit button is displayed (if the user has
permissions).

## Notes

- The provider must wrap all `BlokkliField` components that belong to the
  entity
- Only one provider should be active on a page at a time (though multiple can
  exist for different content regions)
- The provider automatically provides context to all child components via Vue's
  provide/inject system
- During editing, the entity data is automatically merged with the edit state,
  so you always work with the latest data
