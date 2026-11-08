<template>
  <Page v-bind="props" />
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { useBlockRegistration } from '#blokkli/editor/composables'
import Page from '../../FieldPager/Page/index.vue'
import type { FieldPagerPageProps } from '../../FieldPager/types'

const props = defineProps<FieldPagerPageProps>()

const { dom } = useBlokkli()

// The field doesn't show the block, so the page stands in for it: it's the
// block's element, as a proxy is in the Structure view.
useBlockRegistration(dom, props.uuid)
</script>
