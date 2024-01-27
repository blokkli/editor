# Edit State

When the blökkli editor is mounted, a few things change:

- The block items array passed in `<BlokkliField :list="block">` is ignored
- The options on blocks are overriden by the "mutated options" from the edit
  state

The editor loads the edit state using the [loadState()](/adapter/loadState)
method on the adapter. This state object is updated after every mutation, for
example when moving a block, blökkli expects the updated state to be returned by
the moveBlocks() method of the adapter.

The expected state has the following properties:

## currentIndex

`number`

This is the current index in the history stack. The default value is `-1`,
meaning there is no mutation in the history stack. When a mutation is added, the
index should become `0`, and so on.

## mutations

[type.MutationItem[]]

This should contain an array of all mutations that have been applied in the
current edit state.

### Example

```json
[
  {
    "timestamp": 1706109810,
    "pluginId": "move_blocks",
    "plugin": {
      "label": "Move 'Title' block",
      "affectedItemUuid": "9ab46061-c9f3-40fb-bfb1-27ba3bb628f5"
    }
  },
  {
    "timestamp": 1706109422,
    "pluginId": "add_new_block",
    "plugin": {
      "label": "Add 'Text' block",
      "affectedItemUuid": "d8d3ad51-7c37-4a27-ad64-e04ee8a4f842"
    }
  },
  {
    "timestamp": 1706107204,
    "pluginId": "add_new_block",
    "plugin": {
      "label": "Add 'Title' block",
      "affectedItemUuid": "9ab46061-c9f3-40fb-bfb1-27ba3bb628f5"
    }
  }
]
```

## currentUserIsOwner

`boolean`

This should indicate whether the current user is also the owner of the edit
state. When this value is `false`, then the current user cannot edit any
content. Instead a banner is shown with a button to "take ownership". When
clicked, the [takeOwnership()](/adapter/takeOwnership) method is called on the
adapter, which is expected to change the owner of the edit state to the current
user.

By always returning `true` here you can disable the "ownership" feature.

## ownerName

`string`

The name of the owner of the edit state. This is used when `currentUserIsOwner`
is `false` and the "take ownership" banner is displayed.

## mutatedState

[type.MappedState]

This contains the mutated state that is used to render the edited blocks.

## mutatedState.fields

[type.MutatedField[]]

This should contain an array of **all** block fields (both on the root level and
nested block fields).

During editing, blocks passed to the `<BlokkliField>` component as props **are
ignored**. Instead blökkli will find a matching item from the
`mutatedState.fields` array and use the `list` property to render the block
components.

### Example

```json
[
  {
    "name": "blocks",
    "entityType": "content",
    "entityUuid": "1",
    "list": [
      {
        "uuid": "96f7fbda-04d9-4662-9a6c-6aa3bcf964f2",
        "bundle": "title",
        "props": {
          "title": "Hello world"
        }
      },
      {
        "uuid": "9485812c-0ecd-4699-85b2-3a031d47a0a1",
        "bundle": "grid",
        "props": {
          "card": []
        }
      }
    ]
  },
  {
    "name": "cards",
    "entityType": "block",
    "entityUuid": "9485812c-0ecd-4699-85b2-3a031d47a0a1",
    "list": [
      {
        "uuid": "96f7fbda-04d9-4662-9a6c-6aa3bcf964f2",
        "bundle": "card",
        "props": {
          "title": "Hello world",
          "text": "Lorem ipsum dolor"
        }
      },
      {
        "uuid": "9485812c-0ecd-4699-85b2-3a031d47a0a1",
        "bundle": "card",
        "props": {
          "title": "A second card",
          "text": "Lorem ipsum dolor"
        }
      }
    ]
  }
]
```

## mutatedState.mutatedOptions

`Record<string, Record<string, string>>`

This object contains the mutated options of all blocks, keyed by block UUID.

```json
{
  "9485812c-0ecd-4699-85b2-3a031d47a0a1": {
    "buttonType": "secondary"
  },
  "87098bb1-d849-4afc-8845-05ef2d08d160": {
    "background": "red",
    "anchorId": "contact-us"
  }
}
```

These options are used to override the existing options on a block. This object
is made reactive, which allows the user to instantly see how changing an option
value affects the block.

## entity

[type.EditEntity]

This should contain additional information about the host entity being edited.

This data is used by the "entity_title" feature to display the current page
title and status.

```json
{
  "label": "Landing page winter 2024",
  "status": true, // true = entity is published, false = entity is not published
  "bundleLabel": "Landing Page" // Human-readable label of the entity bundle
}
```

## translationState

[type.TranslationState]

If you need to support translations and multiple languages, this property should
contain detailed information about the current translation state.

## translationState.isTranslatable

`boolean`

Whether the host entity is translatable at all. If `false`, then translations
and language selector are disabled.

## translationState.sourceLanguage

`string|null`

The source language of the host entity. If the current language does not match
the source language, blökkli assumes the user is editing the translation, which
disables most of the features (so only blocks can be translated).

## translationState.availableLanguages

[type.Language[]]

An array of languages that are generally available.

```json
[
  {
    "id": "en",
    "name": "English"
  },
  {
    "id": "de",
    "name": "German"
  },
  {
    "id": "fr",
    "name": "French"
  },
  {
    "id": "it",
    "name": "Italian"
  }
]
```

## translationState.translations

[type.EntityTranslation[]]

An array of existing translations of the entity.

```json
[
  {
    "id": "en",
    "url": "/en/subscribe-to-newsletter",
    "status": true // Translation exists and is published.
  },
  {
    "id": "de",
    "url": "/de/anmeldung-newsletter",
    "status": false // Translation exists, but is not published.
  }
]
```

## Full example

This is an example of a full edit state object that should be returned by
[mapState()](/adapter/mapState) of the adapter.

```json
{
  "currentIndex": 2,
  "mutations": [
    {
      "timestamp": 1706109810,
      "pluginId": "move_blocks",
      "plugin": {
        "label": "Move 'Title' block",
        "affectedItemUuid": "9ab46061-c9f3-40fb-bfb1-27ba3bb628f5"
      }
    },
    {
      "timestamp": 1706109422,
      "pluginId": "add_new_block",
      "plugin": {
        "label": "Add 'Text' block",
        "affectedItemUuid": "d8d3ad51-7c37-4a27-ad64-e04ee8a4f842"
      }
    },
    {
      "timestamp": 1706107204,
      "pluginId": "add_new_block",
      "plugin": {
        "label": "Add 'Title' block",
        "affectedItemUuid": "9ab46061-c9f3-40fb-bfb1-27ba3bb628f5"
      }
    }
  ],

  "currentUserIsOwner": true,
  "ownerName": "John Wayne",
  "mutatedState": {
    "mutatedOptions": {
      "9485812c-0ecd-4699-85b2-3a031d47a0a1": {
        "buttonType": "secondary"
      },
      "87098bb1-d849-4afc-8845-05ef2d08d160": {
        "background": "red",
        "anchorId": "contact-us"
      }
    },
    "fields": [
      {
        "name": "blocks",
        "entityType": "content",
        "entityUuid": "1",
        "list": [
          {
            "uuid": "96f7fbda-04d9-4662-9a6c-6aa3bcf964f2",
            "bundle": "title",
            "props": {
              "title": "Hello world"
            }
          },
          {
            "uuid": "9485812c-0ecd-4699-85b2-3a031d47a0a1",
            "bundle": "grid",
            "props": {
              "card": []
            }
          }
        ]
      },
      {
        "name": "cards",
        "entityType": "block",
        "entityUuid": "9485812c-0ecd-4699-85b2-3a031d47a0a1",
        "list": [
          {
            "uuid": "96f7fbda-04d9-4662-9a6c-6aa3bcf964f2",
            "bundle": "card",
            "props": {
              "title": "Hello world",
              "text": "Lorem ipsum dolor"
            }
          },
          {
            "uuid": "9485812c-0ecd-4699-85b2-3a031d47a0a1",
            "bundle": "card",
            "props": {
              "title": "A second card",
              "text": "Lorem ipsum dolor"
            }
          }
        ]
      }
    ],
    "violations": []
  },

  "entity": {
    "label": "Landing page winter 2024",
    "status": true,
    "bundleLabel": "Landing Page"
  },

  "translationState": {
    "isTranslatable": true,
    "sourceLanguage": "en",
    "availableLanguages": [
      {
        "id": "en",
        "name": "English"
      },
      {
        "id": "de",
        "name": "German"
      },
      {
        "id": "fr",
        "name": "French"
      },
      {
        "id": "it",
        "name": "Italian"
      }
    ],
    "translations": [
      {
        "id": "en",
        "url": "/en/subscribe-to-newsletter",
        "status": true
      },
      {
        "id": "de",
        "url": "/de/anmeldung-newsletter",
        "status": false
      }
    ]
  }
}
```
