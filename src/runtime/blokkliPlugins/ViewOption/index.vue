<template>
  <Teleport to="#bk-toolbar-view-options">
    <button
      v-if="!ui.isMobile.value"
      ref="button"
      class="bk-toolbar-button"
      :class="{ 'bk-is-inactive': !isActive }"
      @click.prevent.stop="onClick"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        <span>{{ title }}</span>

        <ShortcutIndicator
          v-if="keyCode"
          meta
          :key-code="keyCode"
          :label="label"
          group="ui"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>

  <slot :is-active="isActive && !ui.isMobile.value" />
</template>

<script setup lang="ts">
import { useBlokkli, computed, ref } from '#imports'
import { ShortcutIndicator, Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'

const { storage, ui } = useBlokkli()

const props = defineProps<{
  id: string
  label: string
  titleOn: string
  titleOff: string
  editOnly?: boolean
  keyCode?: string
  icon?: BlokkliIcon
  tourText?: string
  modelValue?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', data: boolean): void
}>()

const storageKey = 'view_option_' + props.id
const button = ref<HTMLElement | null>(null)

const isActiveStorage = storage.use(storageKey, false)

const isActive = computed({
  get() {
    return isActiveStorage.value
  },
  set(v: boolean) {
    isActiveStorage.value = v
    emit('update:modelValue', v)
  },
})

emit('update:modelValue', isActiveStorage.value)

const title = computed(() => (isActive.value ? props.titleOff : props.titleOn))

const onClick = () => {
  isActive.value = !isActive.value
}

defineCommands(() => {
  return {
    id: 'plugin:view_option:' + props.id,
    label: title.value,
    icon: props.icon,
    group: 'ui',
    callback: () => (isActive.value = !isActive.value),
  }
})

defineTourItem(() => {
  if (!props.tourText) {
    return
  }
  return {
    id: 'plugin:view_option:' + props.id,
    title: props.label,
    text: props.tourText,
    element: () => button.value,
  }
})
</script>

<script lang="ts">
export default {
  name: 'PluginViewOption',
}
</script>
