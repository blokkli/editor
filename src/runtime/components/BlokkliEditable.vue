<template>
  <component :is="EditComponent ?? tag" v-bind="editProps">
    <template #default="slotProps">
      <slot :value="slotProps?.value ?? value" />
    </template>
  </component>
</template>

<script setup lang="ts">
import { inject, computed } from '#imports'
import { INJECT_EDIT_EDITABLE_COMPONENT } from '#blokkli/helpers/injections'

const props = withDefaults(
  defineProps<{
    /**
     * The (machine) name of the field that is editable.
     */
    name?: string | null

    /**
     * The text value.
     */
    value?: string

    /**
     * The tag to use for rendering the wrapper.
     *
     * @default "div"
     */
    tag?: string
  }>(),
  {
    tag: 'div',
    value: '',
    name: null,
  },
)

defineSlots<{
  default(props: { value: string }): any
}>()

const EditComponent = inject(INJECT_EDIT_EDITABLE_COMPONENT, null)

const editProps = computed(() =>
  EditComponent ? { name: props.name, value: props.value, tag: props.tag } : {},
)
</script>
