<template>
  <div v-if="markup" class="bk-blokkli-item-icon" v-html="markup" />
  <div v-else-if="bundle === BUNDLE_FROM_LIBRARY" class="bk-blokkli-item-icon">
    <Icon name="reusable" />
  </div>
  <div v-else class="bk-blokkli-item-icon">
    <Icon name="question" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import { BUNDLE_FROM_LIBRARY } from '#blokkli/constants'

const props = defineProps<{
  bundle?: string
}>()

const { definitions } = useBlokkli()

const markup = computed(() =>
  props.bundle ? definitions.getBlockIcon(props.bundle) : undefined,
)
</script>

<script lang="ts">
export default {
  name: 'ItemIcon',
}
</script>
