<template>
  <div
    class="p-10 bg-red-normal text-red-light font-semibold flex items-center gap-5 text-sm text-pretty"
  >
    <Icon name="bk_mdi_warning" class="size-25 shrink-0" />
    <span>{{
      $t(
        'formSaveNotEditStateInfo',
        'Saving this form applies changes immediately — they take effect without publishing the current blökkli page.',
      )
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'
import { useBlokkli } from '#imports'

const { $t } = useBlokkli()
</script>
