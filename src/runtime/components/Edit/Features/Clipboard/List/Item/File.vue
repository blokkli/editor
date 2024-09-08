<template>
  <div class="bk-clipboard-item-file">
    <div class="bk-clipboard-item-file-lines">
      <div
        v-for="n in 10"
        :key="n"
        :style="{
          width: Math.max(Math.min(prng(n + fileSize) * 230, 100), 40) + '%',
        }"
      />
    </div>
    <h3>{{ fileName }}</h3>
    <ul>
      <li>{{ extension }}</li>
      <li>{{ fileSizeReadable }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { ClipboardItemFile } from '#blokkli/types'

const props = defineProps<ClipboardItemFile>()

function prng(seed: number) {
  // eslint-disable-next-line
  seed = (seed ^ 0x6d2b79f5) + (seed << 1)
  seed = seed ^ (seed >> 15)
  seed = seed + (seed << 4)
  seed = seed ^ (seed >> 13)
  // eslint-disable-next-line
  seed = seed * 0x85ebca6b
  seed = seed ^ (seed >> 16)
  seed = seed >>> 0
  return seed / 4294967296
}

function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B'
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10 ** dp

  do {
    bytes /= thresh
    ++u
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  )

  return bytes.toFixed(dp) + ' ' + units[u]
}

const fileSizeReadable = computed(() => humanFileSize(props.fileSize))

const extension = computed(() => {
  return (props.fileType.split('/')[1] || props.fileType || '').toUpperCase()
})
</script>
