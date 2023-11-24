<template>
  <Teleport :to="to">
    <button
      class="pb-toolbar-menu-list-button"
      :disabled="disabled"
      @click="onClick"
      :class="type ? 'pb-is-' + type : ''"
    >
      <div class="pb-toolbar-menu-list-icon">
        <slot></slot>
      </div>
      <strong>{{ title }}</strong>
      <span>{{ description }}</span>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
const props = defineProps<{
  title: string
  description: string
  disabled?: boolean
  type?: 'success' | 'danger'
  weight?: number
  secondary?: boolean
}>()

const emit = defineEmits(['click'])

const { eventBus } = useParagraphsBuilderStore()

const to = computed(
  () => `#pb-toolbar-menu-${props.secondary ? 'secondary' : 'primary'}`,
)

function onClick() {
  eventBus.emit('closeMenu')
  emit('click')
}
</script>
