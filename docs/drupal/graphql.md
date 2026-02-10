# GraphQL Fragments

The Drupal adapter communicates with Drupal entirely through GraphQL. The module
ships with all necessary queries, mutations, and most fragments. You only need
to provide a few project-specific fragments that define the shape of **your**
content.

## What the Module Provides

The Drupal module automatically registers:

- **All queries and mutations** (edit state, config, add/move/delete, undo/redo,
  publish, etc.)
- **`blokkliProps`** fragment — provides entity context for `<BlokkliProvider>`
- **`paragraphsFieldItem`** fragment — provides paragraph metadata (UUID,
  bundle, options)
- **All feature-specific GraphQL** (comments, library, media, search, etc.) —
  conditionally registered based on your Drupal schema

You do **not** need to create any of these.

## What You Need to Create

Your project must provide three things:

### 1. Paragraph Bundle Fragments

Each paragraph type needs a fragment that defines its content fields. Place
these next to your block components.

::: code-group

```graphql [~/components/Paragraph/Text/fragment.graphql]
fragment paragraphText on ParagraphText {
  text: fieldText
}
```

:::

::: code-group

```graphql [~/components/Paragraph/Image/fragment.graphql]
fragment paragraphImage on ParagraphImage {
  image: fieldImage {
    ...mediaImage
  }
}
```

:::

For nested paragraphs, include `paragraphsFieldItem` and spread the individual
bundle fragments that are allowed in that field. You **cannot** use
`...paragraph` here because that would create a recursive fragment reference —
instead, list each allowed bundle fragment explicitly:

::: code-group

```graphql [~/components/Paragraph/TwoColumns/fragment.graphql]
fragment paragraphTwoColumns on ParagraphTwoColumns {
  left: fieldLeft {
    ...paragraphsFieldItem
    props {
      ...paragraphText
      ...paragraphImage
    }
  }
  right: fieldRight {
    ...paragraphsFieldItem
    props {
      ...paragraphText
      ...paragraphImage
    }
  }
}
```

:::

### 2. The `paragraph` Union Fragment

Collect all paragraph bundle fragments into a single union fragment named
`paragraph`. The module's internal fragments reference this by name.

::: code-group

```graphql [~/components/Paragraph/fragment.paragraph.graphql]
fragment paragraph on Paragraph {
  ...paragraphText
  ...paragraphImage
  ...paragraphTwoColumns
  ...paragraphCarousel
}
```

:::

::: warning

Important The fragment **must** be named `paragraph` — the module's built-in
fragments spread `...paragraph` to fetch paragraph content.

:::

### 3. The `pbMutatedEntity` Fragment

When a user edits content, the adapter fetches the mutated entity to update the
page. This fragment defines which entity fields to include.

Add an inline fragment for every entity type that uses blökkli:

::: code-group

```graphql [~/graphql/blokkli.graphql]
fragment pbMutatedEntity on Entity {
  ... on NodePage {
    title
    lead: fieldLead
  }

  ... on NodeArticle {
    title
    subtitle: fieldSubtitle
  }

  # If you use the library feature:
  libraryItemLabel: label
}
```

:::

::: warning

Important The fragment **must** be named `pbMutatedEntity` — the module's edit
state fragment references it by this exact name.

:::

The fields listed here should match the non-paragraph fields that your page
components render (title, lead, etc.). This allows `<BlokkliProvider>` to
reflect edits to these fields in real time.

## Using Fragments in Entity Queries

In your node/entity fragments, use the module-provided `blokkliProps` and
`paragraphsFieldItem` fragments together with your `paragraph` fragment:

```graphql
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

Every paragraph field follows this two-part structure:

- **`...paragraphsFieldItem`** — Metadata (UUID, bundle, options) used by
  blökkli internally
- **`props { ...paragraph }`** — Content data passed as props to your block
  components

## Fragment Naming and Type Generation

The Drupal module automatically generates TypeScript types from your fragment
names. The convention is:

| Bundle name   | Fragment name         | Generated type                |
| ------------- | --------------------- | ----------------------------- |
| `text`        | `paragraphText`       | `ParagraphTextFragment`       |
| `image`       | `paragraphImage`      | `ParagraphImageFragment`      |
| `two_columns` | `paragraphTwoColumns` | `ParagraphTwoColumnsFragment` |

This gives you fully typed block props when using `siblings`, `rootBlocks`, or
the `<BlokkliField>` slot:

```vue
<script lang="ts" setup>
const { siblings } = defineBlokkli({ bundle: 'text' })

// Type narrowing works with generated types.
const titles = computed(() =>
  siblings.value.filter((v) => v.bundle === 'title'),
)
// Each item in titles has typed props (ParagraphTitleFragment).
</script>
```
