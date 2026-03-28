<template>
  <div>
    <QrCodeVue
      :value="fullUrl"
      :size="430"
      level="H"
      class="!w-full !h-auto aspect-square"
    />
    <p class="my-20">
      {{ $t('previewQrCodeText', 'You can also copy the link and share it.') }}
    </p>
    <input :value="fullUrl" class="bk-form-input" readonly @focus="onFocus" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import QrCodeVue from 'qrcode.vue'

const { $t } = useBlokkli()

const props = defineProps<{
  url: string
}>()

const fullUrl = computed(() => {
  return window.location.origin + props.url
})

function onFocus(e: FocusEvent) {
  if (e.target && e.target instanceof HTMLInputElement) {
    e.target.select()
  }
}
</script>
