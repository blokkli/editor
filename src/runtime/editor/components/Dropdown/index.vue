<template>
  <div ref="container" class="bk-dropdown-menu">
    <button
      class="bk-dropdown-menu-trigger"
      :disabled="disabled"
      @click="showMenu = !showMenu"
    >
      <slot name="button" />
    </button>
    <BlokkliTransition name="drop-up">
      <div
        v-if="showMenu"
        class="bk-dropdown-menu-content"
        :class="positionClass"
      >
        <slot />
      </div>
    </BlokkliTransition>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
  useBlokkli,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'

const props = withDefaults(
  defineProps<{
    position?: 'bottom-left' | 'top-right'
    disabled?: boolean
  }>(),
  {
    position: 'bottom-left',
    disabled: false,
  },
)

const { eventBus } = useBlokkli()

const container = useTemplateRef('container')
const showMenu = ref(false)

const positionClass = computed(() => `bk-is-${props.position}`)

function close() {
  showMenu.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (!container.value?.contains(e.target as Node)) {
    close()
  }
}

eventBus.on('mouse:up', close)

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  eventBus.off('mouse:up', close)
})

defineExpose({ close })
</script>
