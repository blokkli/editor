<template>
  <div class="container mx-auto my-20">
    <BlokkliIframe :src="props.url" :heights="iframeHeights">
      <iframe
        :src="props.url"
        style="width: 100%; height: 100%; border: 0"
        scrolling="no"
      />
    </BlokkliIframe>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, watch } from '#imports'
import { BlokkliIframe } from '#blokkli/iframes/components'
import type { IframeHeightMap } from '#blokkli/iframes/types'

const { options } = defineBlokkli({
  bundle: 'iframe',
  options: {
    iframeHeight: {
      type: 'json',
      label: 'Iframe heights',
      default: '{}',
      dataType: 'iframe_heights',
    },
  },
  editor: {
    previewWidth: 800,
    icon: 'bk_mdi_fit_screen',
  },
})

export type Props = {
  url: string
}

watch(
  () => options.value.iframeHeight,
  (height) => {
    console.log(height)
  },
  {
    immediate: true,
  },
)

const props = defineProps<Props>()

const iframeHeights = computed<IframeHeightMap>(() => {
  return options.value.iframeHeight || {}
})
</script>
