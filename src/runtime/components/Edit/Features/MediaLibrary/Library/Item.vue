<template>
  <div
    :key="mediaId"
    class="bk-media-library-items-item"
    :class="{ 'bk-is-selected': isSelected }"
    :data-sortli-id="'media_library_' + mediaId"
    data-element-type="media_library"
    :data-item-bundle="targetBundles[0]"
    :data-media-id="mediaId"
    :data-media-bundle="mediaBundle"
  >
    <div class="bk-media-library-items-item-box">
      <label @click.stop>
        <input v-model="selected" type="checkbox" :value="mediaId" />
      </label>
      <div class="bk-media-library-items-item-image">
        <img :src="thumbnail" />
      </div>
    </div>
    <div class="bk-media-library-items-item-text">
      <h3>{{ label }}</h3>
      <p>{{ context }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli/icons'
import { computed } from '#imports'

const props = defineProps<{
  mediaId: string
  label: string
  context: string
  targetBundles: string[]
  thumbnail?: string
  icon?: BlokkliIcon
  mediaBundle?: string
}>()

const selected = defineModel<string[]>()

const isSelected = computed(() => selected.value?.includes(props.mediaId))
</script>
