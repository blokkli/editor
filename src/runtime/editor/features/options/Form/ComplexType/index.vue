<template>
  <button
    v-if="config"
    class="bk-blokkli-item-options-complex-type"
    @click="onClick"
  >
    <Icon :name="config.editorIcon as BlokkliIcon" />
    <span>{{ $t(config.editorButtonLabel, config.editorButtonLabel) }}</span>
  </button>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { COMPLEX_OPTION_TYPES } from '#blokkli-build/complex-option-types'
import type { BlokkliIcon } from '#blokkli-build/icons'

const { eventBus, $t } = useBlokkli()

const props = defineProps<{
  uuid: string
  property: string
  dataType: string
}>()

const config =
  COMPLEX_OPTION_TYPES[props.dataType as keyof typeof COMPLEX_OPTION_TYPES]

function onClick() {
  eventBus.emit('option:edit-complex', {
    uuid: props.uuid,
    key: props.property,
    dataType: props.dataType,
  })
}
</script>

<script lang="ts">
export default {
  name: 'OptionsFormComplexType',
}
</script>
