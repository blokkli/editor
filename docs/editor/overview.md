# Editor Overview

The core of blökkli is its editor. It offers an intuitive drag and drop
interface to build content.

## Starting the editor

The editor is started from within the `<BlokkliProvider>` component. It displays
an "Edit Blocks" button to start the editor.

The button is only displayed if the `:can-edit` prop is `true`. An example
implementation might look like this:

::: code-group

```vue [~/pages/example.vue]
<template>
  <BlokkliProvider
    entity-type="content"
    entity-bundle="blog_post"
    entity-uuid="908fac9f-e47e-4478-bfd8-ab8ac947835b"
    :can-edit="user.isAdmin"
  >
  </BlokkliProvider>
</template>

<script lang="ts" setup>
const user = useCurrentUser()
</script>
```

:::

## Editor Context

Because the editor is directly bound to the `<BlokkliProvider>` component, it
only manages _a single host entity_ at a time. This means that if you have
multiple providers on the same page (say one for the actual page content and one
for a footer that is rendered on all pages), there will be two "Edit blocks"
buttons.

This also means that you can't edit two provider contexts at the same time and
therefore not move blocks between two parent entities.

The current entity context is part of the URL in the form of the entity UUID:

```
/en/topics/my-test-page?blokkliEditing=908fac9f-e47e-4478-bfd8-ab8ac947835b
```

The editor will only mount when `:can-edit` is `true` and the `blokkliEditing`
query value is equal to the `:entity-uuid` prop value.
