<template>
  <div class="grid grid-cols-2 gap-10 items-start">
    <div class="min-h-[46px] pt-[10px]">
      {{ source || sourcePlaceholder }}
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'

defineProps<{
  source: string
}>()

const { $t } = useBlokkli()

const sourcePlaceholder = computed(() =>
  $t('chartsTranslationsSource', 'Source'),
)
</script>
