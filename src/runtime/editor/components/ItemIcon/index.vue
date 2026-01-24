<template>
  <div v-if="markup" class="bk-blokkli-item-icon" v-html="markup" />
  <div v-else class="bk-blokkli-item-icon">
    <Icon :name="iconName" />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { fromLibraryBlockBundle } from '#blokkli-build/config'

const props = defineProps<{
  bundle?: string
}>()

const { definitions } = useBlokkli()

const markup = computed(() =>
  props.bundle ? definitions.getBlockIcon(props.bundle) : undefined,
)

const iconName = computed<BlokkliIcon>(() => {
  if (props.bundle === fromLibraryBlockBundle) {
    return 'reusable'
  } else if (props.bundle) {
    const name = definitions.getBlockDefinition(props.bundle, 'default')?.editor
      ?.icon
    if (name) {
      return name
    }
  }

  return 'bk_mdi_question_mark'
})
</script>

<script lang="ts">
export default {
  name: 'ItemIcon',
}
</script>
