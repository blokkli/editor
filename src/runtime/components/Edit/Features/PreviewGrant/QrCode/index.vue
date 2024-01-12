<template>
  <div class="bk-qr-code">
    <canvas ref="canvas" />
    <p>
      {{ $t('previewQrCodeText', 'You can also copy the link and share it.') }}
    </p>
    <input :value="fullUrl" class="bk-form-input" readonly @focus="onFocus" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, useBlokkli } from '#imports'
import QR from 'qrcode-generator'

const { $t } = useBlokkli()

const canvas = ref<HTMLCanvasElement | null>(null)

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

onMounted(() => {
  if (!canvas.value) {
    return
  }

  const qr = QR(4, 'L')
  qr.addData(fullUrl.value)
  qr.make()

  const ctx = canvas.value.getContext('2d')
  if (ctx) {
    qr.renderTo2dContext(ctx, 5)
  }
})
</script>
