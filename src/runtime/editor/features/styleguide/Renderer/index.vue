<template>
  <article class="bk-styleguide-variant">
    <header class="bk-styleguide-variant-header">
      <h3>{{ variant.label }}</h3>
      <p v-if="variant.description">{{ variant.description }}</p>
    </header>
    <div
      class="bk-styleguide-variant-stage"
      :class="variant.backgroundClass ?? entry.backgroundClass ?? 'bg-white'"
    >
      <Stage />
    </div>
    <details v-if="formattedState" class="bk-styleguide-variant-source">
      <summary>Props</summary>
      <pre>{{ formattedState }}</pre>
    </details>
  </article>
</template>

<script setup lang="ts">
import { computed, h, reactive } from '#imports'
import type {
  EditorComponentMeta,
  EditorComponentVariant,
} from '#blokkli/editor/composables/defineEditorComponent'

const props = defineProps<{
  entry: EditorComponentMeta
  variant: EditorComponentVariant<Record<string, any>>
}>()

const state = reactive<Record<string, any>>({ ...props.variant.props })

function Stage() {
  const handlers: Record<string, (value: unknown) => void> = {}
  for (const key of Object.keys(state)) {
    if (key.startsWith('onUpdate:')) continue
    handlers[`onUpdate:${key}`] = (value) => {
      state[key] = value
    }
  }

  const slots = props.variant.slots
    ? Object.fromEntries(
        Object.entries(props.variant.slots).map(([name, fn]) => [
          name,
          (scope?: unknown) => fn(scope),
        ]),
      )
    : undefined

  return h(props.entry.component as any, { ...state, ...handlers }, slots)
}

const formattedState = computed(() => {
  const visible: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'function') continue
    visible[key] = value
  }
  if (!Object.keys(visible).length) return ''
  return JSON.stringify(visible, null, 2)
})
</script>

<script lang="ts">
export default {
  name: 'StyleguideComponentRenderer',
}
</script>
