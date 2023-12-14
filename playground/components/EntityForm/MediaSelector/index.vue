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
        <img :src="entity.thumbnail()" />
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { entityStorageManager } from '~/app/mock/entityStorage'

const props = defineProps<{
  modelValue: string
  bundles: string[]
}>()

defineEmits(['update:modelValue'])

const entities = computed(() => {
  const bundle = props.bundles[0]
  return entityStorageManager.getStorage('media').query({ bundle })
})
</script>

<style lang="postcss">
.media-selector {
  @apply flex;
}
</style>
