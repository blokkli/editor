<template>
  <div class="bk-qr-code">
    <canvas ref="canvas"></canvas>
    <p>
      Sie können den Link auch kopieren und mit anderen Personen teilen (ohne
      Login).
    </p>
    <input :value="fullUrl" @focus="onFocus" class="bk-form-input" readonly />
  </div>
</template>

<script lang="ts" setup>
import QR from 'qrcode'

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

  QR.toCanvas(canvas.value, fullUrl.value, {
    scale: 10,
    margin: 0,
  })
})
</script>
