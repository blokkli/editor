# Page Components

A page component wraps your editable content with `<BlokkliProvider>` and
renders one or more `<BlokkliField>` components for paragraph fields.

## Basic Setup

For each entity type that uses blökkli, create a component that receives
`blokkliProps` from your GraphQL query and passes it to `<BlokkliProvider>`.

::: code-group

```vue [~/components/Node/Page/index.vue]
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="props">
    <h1>{{ entity.title }}</h1>

    <BlokkliField :list="paragraphs" name="field_paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { NodePageFragment } from '#graphql-operations'

const props = defineProps<{
  title: string
  paragraphs: NodePageFragment['paragraphs']
  blokkliProps: NodePageFragment['blokkliProps']
}>()
</script>
```

:::

Key points:

- **`v-bind="blokkliProps"`** spreads the entity type, bundle, UUID,
  permissions, and language from your GraphQL fragment onto the provider
- **`:entity="props"`** passes the full entity data so blökkli can merge it with
  edit state changes
- **`v-slot="{ entity }"`** gives you the merged entity — during editing, this
  reflects the current mutations

## Editable Fields

Use `<BlokkliEditable>` to make entity-level fields (like title or lead text)
editable inline:

```vue
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="props">
    <BlokkliEditable
      name="title"
      tag="h1"
      :value="entity.title"
      class="text-4xl"
      v-slot="{ value }"
    >
      {{ value }}
    </BlokkliEditable>

    <BlokkliEditable
      name="field_lead"
      :value="entity.lead"
      class="text-xl"
      v-slot="{ value }"
    >
      <p>{{ value }}</p>
    </BlokkliEditable>

    <BlokkliField :list="paragraphs" name="field_paragraphs" />
  </BlokkliProvider>
</template>
```

The `name` must match the Drupal field machine name. The adapter uses this to
build the correct edit form URL.

## GraphQL Fragment

Your node fragment must include `blokkliProps` and use the two-part paragraph
field structure:

::: code-group

```graphql [~/components/Node/Page/fragment.graphql]
fragment nodePage on NodePage {
  uuid
  title
  lead: fieldLead

  blokkliProps {
    ...blokkliProps
  }

  paragraphs: fieldParagraphs {
    ...paragraphsFieldItem
    props {
      ...paragraph
    }
  }
}
```

:::

## Host Options

To add page-level options that are editable in blökkli, you need two things:

1. **Drupal**: Add a field of type `paragraphs_blokkli_host_options` to your
   content type
2. **Nuxt**: Use `defineBlokkliProvider()` to define the options

### Drupal Field Setup

The host entity (e.g. a Node) must have a field of type
`paragraphs_blokkli_host_options`. Without this field, the options still appear
in the editor, but changes to them aren't saved.

You can add this field via the Drupal admin UI at
`/admin/structure/types/manage/PAGE_TYPE/fields` or programmatically:

```php
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;

FieldStorageConfig::create([
  'field_name' => 'field_blokkli_options',
  'entity_type' => 'node',
  'type' => 'paragraphs_blokkli_host_options',
  'cardinality' => -1,
])->save();

FieldConfig::create([
  'field_name' => 'field_blokkli_options',
  'entity_type' => 'node',
  'bundle' => 'page',
  'label' => 'Blokkli Options',
])->save();
```

The field machine name can be anything — `paragraphs_blokkli` automatically
discovers the first field of this type on the host entity.

- The field type always has unlimited cardinality: one item per option.
- Make the field untranslatable: options apply to every language.
- Hide the field in the form display. Its widget is empty, so saving the
  entity's form (in Drupal, or the host's edit form in the editor) would delete
  the options.
- The GraphQL server needs no configuration for it: the values are part of
  `blokkliProps`.

### Nuxt Provider Setup

Use `defineBlokkliProvider()` to define the options:

```vue
<script lang="ts" setup>
import type { NodePageFragment } from '#graphql-operations'

const props = defineProps<{
  title: string
  paragraphs: NodePageFragment['paragraphs']
  blokkliProps: NodePageFragment['blokkliProps']
}>()

const { options } = defineBlokkliProvider(props, {
  entityType: 'node',
  bundle: 'page',
  options: {
    theme: {
      type: 'radios',
      label: 'Theme',
      default: 'light',
      options: {
        light: 'Light',
        dark: 'Dark',
      },
    },
  },
})
</script>
```

See [defineBlokkliProvider()](/components/BlokkliProvider#defineblokkliprovider)
for full documentation.

## Multiple Paragraph Fields

Entities can have multiple paragraph fields. Each one gets its own
`<BlokkliField>`:

```vue
<template>
  <BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="props">
    <header>
      <BlokkliField :list="headerParagraphs" name="field_header" />
    </header>
    <main>
      <BlokkliField :list="paragraphs" name="field_paragraphs" />
    </main>
    <footer>
      <BlokkliField :list="footerParagraphs" name="field_footer" />
    </footer>
  </BlokkliProvider>
</template>
```

## Using the Merged Entity

During editing, the entity data from the `v-slot` is automatically merged with
the current edit state. This means changes to editable fields or host options
are immediately reflected:

```vue
<BlokkliProvider v-slot="{ entity }" v-bind="blokkliProps" :entity="props">
  <!-- "entity.title" updates live when the user edits it. -->
  <h1>{{ entity.title }}</h1>
</BlokkliProvider>
```

Outside of editing, `entity` is the same as the data you passed via `:entity`.

## Library Item and Template Pages

Library items and templates are edited on pages of their own. Their canonical
URLs, which Drupal links to, are these pages, by the entity's ID:

- a library item: `/blokkli/library-item/{id}` (`paragraphs_blokkli_library`);
- a template: `/blokkli/template/{id}` (`paragraphs_blokkli_template`).

The editor links there too, behind the language prefix, e.g.
`/de/blokkli/template/3?blokkliEditing=<uuid>`. Create the two pages at these
paths, with the components that load and render the entity:

::: code-group

```vue [~/pages/blokkli/library-item/[id].vue]
<template>
  <BlokkliDrupalEditLibraryItem v-slot="{ entity }" :id>
    <h1 v-blokkli-editable:label>{{ entity.libraryItemLabel }}</h1>
  </BlokkliDrupalEditLibraryItem>
</template>

<script setup lang="ts">
import BlokkliDrupalEditLibraryItem from '#blokkli/drupal/components/BlokkliDrupalEditLibraryItem/index.vue'

const id = String(useRoute().params.id)
</script>
```

```vue [~/pages/blokkli/template/[id].vue]
<template>
  <BlokkliDrupalEditTemplate :id />
</template>

<script setup lang="ts">
import BlokkliDrupalEditTemplate from '#blokkli/drupal/components/BlokkliDrupalEditTemplate/index.vue'

const id = String(useRoute().params.id)
</script>
```

:::

Both answer 404 when the entity doesn't exist or the user may not view it or use
blökkli. `BlokkliDrupalEditLibraryItem`'s slot renders above the paragraphs,
with the entity as it is while editing: `libraryItemLabel` is the library item's
label, as in the
[`pbMutatedEntity` fragment](/modules/drupal/graphql#_3-the-pbmutatedentity-fragment).

For the editor's link to a library item, the fragment of the `from_library`
paragraph needs the item's `id`:

```graphql
fragment paragraphFromLibrary on ParagraphFromLibrary {
  libraryItem: fieldReusableParagraph {
    id
    uuid
    label
    block: paragraphs {
      ...paragraphsFieldItem
      props {
        ...paragraphLeaf
      }
    }
  }
}
```

Without it, a placed library item can't be edited.
