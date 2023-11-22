<template>
  <div
    class="pb-paragraph-options-checkboxes"
    :class="{ 'pb-is-active': isOpen }"
  >
    <button @click="isOpen = !isOpen">
      <div>
        <span>{{ label }}</span>
        <span v-for="item in checked" class="pb-pill">{{ item }}</span>
      </div>
      <IconCaret />
    </button>
    <div v-if="isOpen">
      <label
        v-for="option in mappedOptions"
        class="pb-paragraph-options-checkbox"
      >
        <input
          type="checkbox"
          v-model="checked"
          class="peer"
          :value="option.key"
        />
        <div></div>
        <span>{{ option.value }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import IconCaret from './../../../../Icons/Caret.vue'

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
