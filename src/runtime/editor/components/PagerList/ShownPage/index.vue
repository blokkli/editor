<template>
  <Page ref="page" v-bind="props" />
</template>

<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  useBlokkli,
  useTemplateRef,
} from '#imports'
import Page from '../../FieldPager/Page/index.vue'
import type { FieldPagerPageProps } from '../../FieldPager/types'

const props = defineProps<FieldPagerPageProps>()

const { dom } = useBlokkli()

const page = useTemplateRef('page')

let element: HTMLElement | null = null

// The block that the field shows renders below the band, as its element. Its
// page stands in for it: pressing the page selects or drags the block, not the
// block holding the field.
onMounted(() => {
  const el: unknown = page.value?.$el
  if (el instanceof HTMLElement) {
    element = el
    dom.registerStandIn(props.uuid, el)
  }
})

onBeforeUnmount(() => {
  if (element) {
    dom.unregisterStandIn(props.uuid, element)
  }
})
</script>
