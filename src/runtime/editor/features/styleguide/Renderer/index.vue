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
      <Stage />
    </div>
    <details
      v-if="formattedState"
      class="border-t border-t-mono-200 bg-mono-50 [&>summary]:px-20 [&>summary]:py-10 [&>summary]:cursor-pointer [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:uppercase [&>summary]:tracking-wide [&>summary]:text-mono-600 [&>summary]:hover:bg-mono-100"
    >
      <summary>Props</summary>
      <pre
        class="px-20 pb-15 m-0 text-xs font-mono text-mono-800 whitespace-pre-wrap"
        >{{ formattedState }}</pre
      >
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
