<template>
  <div class="link-field">
    <label>
      <span>URL</span>
      <input
        :value="current.uri"
        type="text"
        pattern="(https?|/).*?"
        @input="update('uri', $event)"
      />
    </label>
    <label>
      <span>Title</span>
      <input
        :value="current.title"
        type="text"
        @input="update('title', $event)"
      />
    </label>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type { LinkValue } from '#mock/state/Field/UrlWithTitle'

/**
 * Both halves of a `field_link`-shaped value. The title is a property of the
 * link, not a field of its own, so it has to be edited here rather than through
 * an editable text field.
 */
const props = defineProps<{
  // The form's value record is heterogeneous, so accept the union and normalize
  // instead of forcing a cast at every call site.
  modelValue?: string | LinkValue
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: LinkValue): void
}>()

const current = computed<LinkValue>(() => {
  const value = props.modelValue
  if (value && typeof value === 'object') {
    return value
  }
  return { uri: typeof value === 'string' ? value : '', title: '' }
})

const update = (key: keyof LinkValue, event: Event) => {
  emit('update:modelValue', {
    ...current.value,
    [key]: (event.target as HTMLInputElement).value,
  })
}
</script>

<style>
@reference "~/assets/css/tailwind.css";

.link-field {
  @apply flex flex-col gap-10;

  label {
    @apply flex flex-col gap-5;

    span {
      @apply text-sm opacity-70;
    }
  }
}
</style>
