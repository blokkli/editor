<template>
  <div ref="root">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { provide, useTemplateRef } from '#imports'
import { INJECT_POPUP_HOST } from '#blokkli/editor/helpers/injections'

const root = useTemplateRef<HTMLElement>('root')
provide(INJECT_POPUP_HOST, root)
</script>
