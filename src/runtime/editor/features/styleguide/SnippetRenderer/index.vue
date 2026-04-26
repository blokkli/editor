<template>
  <article class="bk-styleguide-variant">
    <header class="bk-styleguide-variant-header">
      <h3>{{ variant.label }}</h3>
      <p v-if="variant.description">{{ variant.description }}</p>
    </header>
    <div
      class="bk-styleguide-variant-stage"
      :class="
        variant.backgroundClass ?? entry.backgroundClass ?? 'bk-is-checkerboard'
      "
    >
      <component :is="variant.component" v-if="variant.component" />
      <Stage v-else />
    </div>
  </article>
</template>

<script setup lang="ts">
import type {
  EditorSnippetMeta,
  EditorSnippetVariant,
} from '#blokkli/editor/composables/defineEditorComponent'

const props = defineProps<{
  entry: EditorSnippetMeta
  variant: EditorSnippetVariant
}>()

function Stage() {
  return props.variant.render?.()
}
</script>

<script lang="ts">
export default {
  name: 'StyleguideSnippetRenderer',
}
</script>
