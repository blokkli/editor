# Library

The library feature provides a way to have reusable blocks that can be added to
multiple host entities (e.g. pages).

## Architecture

Since a block always belongs to exactly one host entity, we cannot directly add
the same block with the same UUID on two pages.

In order to still have reusable blocks, we can instead do the following:

- Define an entity type named "library_item" that is used as the host entity for
  our reusable blocks
- Create a block bundle named "from_library" that references a library_item
  entity
- Add the "from_library" block to the pages we want to display the reusable
  block

That way, when we want to add a reusable block to a page, we instead add a block
of bundle "from_library", where we reference the library item that hosts our
block.

blökkli provides an abstraction layer to make this easier.

## `from_library` block

When the feature is enabled, blökkli includes a block component that handles the
rendering of a reusable block.

## Data Structure

Let's see how our data structure looks like if we have a reusable block on our
page:

```typescript
import type { FieldListItem } from '#blokkli/types'

const blocks: FieldListItem[] = [
  // Normal non-reusable block.
  {
    uuid: '96f7fbda-04d9-4662-9a6c-6aa3bcf964f2',
    bundle: 'title',
    props: {
      title: 'Hello world',
    },
  },
  // The "from_library" block.
  {
    uuid: '9485812c-0ecd-4699-85b2-3a031d47a0a1',
    bundle: 'from_library',
    // blökkli expects a single prop named libraryItem.
    props: {
      // The referenced library item entity.
      libraryItem: {
        // The actual reusable block.
        block: {
          uuid: '9485812c-0ecd-4699-85b2-3a031d47a0a1',
          bundle: 'rich_text',
          props: {
            text: '<p>Lorem ipsum dolor sit amet</p>',
          },
        },
      },
    },
  },
]
```

## Rendering

Rendering a reusable block results in the same DOM markup as if the block were
placed directly, e.g. no wrapping divs.

## Option inheritance

The `from_library` block inherits the options defined by the reusable block it
contains. This means the block displays the same options in the editor.

When changing options on a reusable block, we store the overrides on the
`from_library` block. This makes it possible to vary the appearance of reusable
blocks per page.

## Allowing reusable blocks

Because we "wrap" the reusable block in another block, we also have to make sure
to allow the "from_library" bundle in the fields where reusable blocks should be
placed, in addition to allowing the bundle of the reusable block.

This is done in the [getFieldConfig()](/adapter/getFieldConfig) adapter method.
An example field config that only allows `text` blocks might look like this:

```typescript
import type { FieldConfig } from '#blokkli/types'

const fieldConfig: FieldConfig[] = [
  {
    name: 'field_blocks',
    entityType: 'content',
    entityBundle: 'blog_post',
    label: 'Blocks',
    cardinality: -1,
    canEdit: true,
    allowedBundles: ['text'],
  },
]
```

If we allow the `text` block bundle to be made reusable, we also have to allow
the `from_library` block bundle in our field config:

```typescript
import type { FieldConfig } from '#blokkli/types'

const fieldConfig: FieldConfig[] = [
  {
    name: 'field_blocks',
    entityType: 'content',
    entityBundle: 'blog_post',
    label: 'Blocks',
    cardinality: -1,
    canEdit: true,
    allowedBundles: ['text', 'from_library'],
  },
]
```

Basically: blökkli checks **both** bundles in the field config. This structure
allows us to also restrict placement of reusable blocks.
