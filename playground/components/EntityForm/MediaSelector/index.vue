<template>
  <div class="icon-selector is-media">
    <label v-for="entity in entities" :key="entity.uuid">
      <input
        type="radio"
        :value="entity.uuid"
        @change="$emit('update:modelValue', entity.uuid)"
        name="entity_selector"
      />
      <div>
        <img :src="entity.url()" />
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { entityStorageManager } from '~/app/mock/entityStorage'
import type { MediaImage } from '~/app/mock/state/Media/Media'

const props = defineProps<{
  modelValue: string
}>()

defineEmits(['update:modelValue'])

const entities = computed(() => {
  return entityStorageManager
    .getStorage('media')
    .query({ bundle: 'image' }) as MediaImage[]
})
</script>

<style lang="postcss">
.media-selector {
  @apply flex;
}
</style>
