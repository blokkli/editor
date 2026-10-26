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

Each item has an optional `timestamp` (when the mutation was added, as an ISO
8601 date), `pluginId`, `plugin` (with `label` and `affectedItemUuid`) and
`enabled`.

```json
[
  {
    "timestamp": "2024-01-24T15:23:30.000Z",
    "pluginId": "move_blocks",
    "plugin": {
      "label": "Move 'Title' block",
      "affectedItemUuid": "9ab46061-c9f3-40fb-bfb1-27ba3bb628f5"
    }
  },
  {
    "timestamp": "2024-01-24T15:17:02.000Z",
    "pluginId": "add_new_block",
    "plugin": {
      "label": "Add 'Text' block",
      "affectedItemUuid": "d8d3ad51-7c37-4a27-ad64-e04ee8a4f842"
    }
  },
  {
    "timestamp": "2024-01-24T14:40:04.000Z",
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

## ownerId

`string` (optional)

The ID of the owner of the edit state.

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
    "entityType": "paragraph",
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

`any` (optional)

This object contains the mutated options of all blocks, keyed by block UUID.
Conceptually it maps each block UUID to a record of option keys and their
(string) values, but the field is not strictly typed in the state.

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

## mutatedState.mutatedHostOptions

`Record<string, string>` (optional)

The mutated options of the host entity itself (as opposed to the per-block
options in `mutatedOptions`).

## mutatedState.violations

[type.Validation[]] (optional)

An array of validation violations for the current edit state. Each violation has
a `message` and optional `code`, `propertyPath`, `entityType` and `entityUuid`.

## publishOptions

`PublishOptions`

Contains available publish/workflow options displayed in the publish dialog.
This tells the editor what actions the user can take (e.g. publish, archive,
etc.).

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

`status` is the status of the language being edited. The status of each language
goes into [translationState.translations](#translationstate-translations).

## mutatedEntity

`any` (optional)

The mutated entity data. When present, this is merged with the original entity
data passed to `<BlokkliProvider>` and provided to the slot as the `entity`
prop. Use this to pass updated entity-level field values (like title, lead text)
that were changed via inline editing.

## previewUrl

`string` (optional)

A URL for previewing the current entity. When provided, the editor can offer a
preview link.

## textFieldValues

`array` (optional)

The mutated values of editable text fields. Each entry has a `uuid`,
`fieldName`, `value`, `fieldType` (`'plain'` or `'markup'`), `entityType` and
`entityBundle`.

## droppableFieldValues

`array` (optional)

The mutated values of droppable (reference) fields. Each entry has a `uuid`,
`fieldName`, an array of referenced `ids`, `entityType` and `entityBundle`.

## ignoredAnalyzeIdentifiers

`string[]` (optional)

A list of analyze identifiers that should be ignored. This is used by the
analyze feature to suppress findings the user has dismissed.

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

## translationState.isStatusTranslatable

`boolean|null` (optional)

Whether each translation has a publish status of its own:

- `true`: the language switcher shows each translation's status, and the publish
  dialog lists the translations, so that the user ticks the ones to publish.
- `false`: every language shares one status. The language switcher shows none,
  and the publish dialog's section "Languages" has one row: "All languages".
- `null` or missing: the backend doesn't say. The publish dialog has no section
  "Languages", and publishing an unpublished page publishes its source language.

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

One entry per available language, whether the translation exists or not. The
language switcher uses it: an existing translation leads to its `url`, a missing
one (`exists: false`) opens its `editUrl` to add it. A language without an entry
can't be selected.

```json
[
  {
    "id": "en",
    "url": "/en/subscribe-to-newsletter",
    "editUrl": "/en/node/1/edit",
    "exists": true,
    "status": true // Translation exists and is published.
  },
  {
    "id": "de",
    "url": "/de/anmeldung-newsletter",
    "editUrl": "/de/node/1/edit",
    "exists": true,
    "status": false // Translation exists, but is not published.
  },
  {
    "id": "fr",
    "url": "/en/subscribe-to-newsletter",
    "editUrl": "/fr/node/1/translations/add/en/fr",
    "exists": false,
    "status": false // Not translated yet.
  }
]
```

`editUrl` is optional in the type, but the Drupal adapter drops an entry that
has neither `url` nor `editUrl`.

`status` is whether the translation is published. While each translation has a
status of its own
([isStatusTranslatable](#translationstate-isstatustranslatable) is `true`), the
language switcher shows it for each language, and the publish dialog lists the
existing translations with it.

`canChangeStatus` (optional) is whether the user may change the translation's
status, which publishing an unpublished translation does. When it's `false`, the
publish dialog doesn't let the user tick the translation, or publish the page
when it's the source language's translation and every language shares one
status. When it's missing, the dialog assumes the user may. The Drupal adapter
sets it from the access to edit the published field: Drupal's node form also
needs it to change the status.

## Edit mode

[type.EditMode]

In addition to the mapped state, the editor tracks the current edit mode,
available as `state.editMode`. It can be one of four values:

- `readonly` – the content is displayed but cannot be edited.
- `editing` – the default mode, the user can freely edit content.
- `translating` – the user is editing a translation of the host entity, so only
  blocks can be translated and most structural mutations are disabled.
- `review` – the content is shown in a review mode.

## Full example

This is an example of a full edit state object that should be returned by
[mapState()](/adapter/mapState) of the adapter.

```json
{
  "currentIndex": 2,
  "mutations": [
    {
      "timestamp": "2024-01-24T15:23:30.000Z",
      "pluginId": "move_blocks",
      "plugin": {
        "label": "Move 'Title' block",
        "affectedItemUuid": "9ab46061-c9f3-40fb-bfb1-27ba3bb628f5"
      }
    },
    {
      "timestamp": "2024-01-24T15:17:02.000Z",
      "pluginId": "add_new_block",
      "plugin": {
        "label": "Add 'Text' block",
        "affectedItemUuid": "d8d3ad51-7c37-4a27-ad64-e04ee8a4f842"
      }
    },
    {
      "timestamp": "2024-01-24T14:40:04.000Z",
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
        "entityType": "paragraph",
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

  "publishOptions": {},

  "entity": {
    "label": "Landing page winter 2024",
    "status": true,
    "bundleLabel": "Landing Page"
  },

  "translationState": {
    "isTranslatable": true,
    "isStatusTranslatable": true,
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
        "exists": true,
        "status": true
      },
      {
        "id": "de",
        "url": "/de/anmeldung-newsletter",
        "exists": true,
        "status": false
      }
    ]
  }
}
```
