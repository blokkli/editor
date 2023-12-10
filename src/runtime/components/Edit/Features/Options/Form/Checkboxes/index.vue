<template>
  <div
    class="bk-blokkli-item-options-checkboxes"
    :class="{ 'bk-is-active': isOpen }"
  >
    <button @click="isOpen = !isOpen">
      <div>
        <span>{{ label }}</span>
        <span v-for="item in checked" :key="item" class="bk-pill">{{
          item
        }}</span>
      </div>
      <Icon name="caret" />
    </button>
    <div v-if="isOpen">
      <label
        v-for="option in mappedOptions"
        :key="option.key"
        class="bk-blokkli-item-options-checkbox"
      >
        <input
          v-model="checked"
          type="checkbox"
          class="peer"
          :value="option.key"
        />
        <div />
        <span>{{ option.value }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from '#imports'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  label: string
  value?: string
  options: Record<string, string>
}>()

const emit = defineEmits(['update'])

const isOpen = ref(false)

const checked = computed<string[]>({
  get() {
    return (props.value || '').split(',').filter(Boolean)
  },
  set(newValue: string[]) {
    emit('update', newValue.filter(Boolean).join(','))
  },
})

const mappedOptions = computed(() => {
  return Object.entries(props.options).map(([key, value]) => {
    return { key, value }
  })
})
</script>

<style lang="postcss"></style>