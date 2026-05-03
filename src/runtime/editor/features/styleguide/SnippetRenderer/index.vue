<template>
  <article class="bg-white border border-mono-200 rounded">
    <header class="px-20 py-15 border-b border-b-mono-200">
      <h3 class="text-base font-semibold m-0">{{ variant.label }}</h3>
      <p v-if="variant.description" class="mt-3 text-sm text-mono-600">
        {{ variant.description }}
      </p>
    </header>
    <div
      class="p-30"
      :class="variant.backgroundClass ?? entry.backgroundClass ?? 'bg-white'"
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
