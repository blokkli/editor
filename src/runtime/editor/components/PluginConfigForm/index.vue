<template>
  <ol class="bk-plugin-config-form" :class="{ 'bk-is-stacked': stacked }">
    <slot name="before" />
    <li
      v-for="item in renderedConfig"
      :key="item.name"
      :class="[
        'bk-is-type-' + item.type,
        { 'bk-form-item': stacked, 'bk-has-action': $slots.action },
      ]"
      :data-test="'config-form-' + item.name"
    >
      <FormCheckbox
        v-if="item.type === 'checkbox'"
        v-bind="item"
        v-model="value[item.name]"
      />
      <FormText
        v-else-if="item.type === 'text'"
        v-bind="item"
        v-model="value[item.name]"
        :required="isInputRequired(item, value)"
        :id-prefix
        lazy
      />
      <FormOptions
        v-else-if="item.type === 'options'"
        v-bind="item"
        v-model="value[item.name]"
        :required="isInputRequired(item, value)"
        :id-prefix
      />
      <p
        v-if="errors?.[item.name]"
        class="mt-5 text-sm text-red-normal"
        data-test="config-form-error"
      >
        {{ errors[item.name] }}
      </p>
      <div v-if="$slots.action" class="bk-plugin-config-form-action">
        <slot name="action" :input="item" />
      </div>
      <slot name="after" />
    </li>
  </ol>
</template>

<script setup lang="ts">
import FormCheckbox from './Checkbox/index.vue'
import FormText from './Text/index.vue'
import FormOptions from './Options/index.vue'
import { computed, useId } from '#imports'
import {
  isInputRequired,
  isInputVisible,
} from '#blokkli/editor/helpers/pluginConfig'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'

const props = defineProps<{
  config: PluginConfigInput[]
  /**
   * Errors to show at the fields, keyed by their names.
   */
  errors?: Record<string, string>
  /**
   * Show the fields one below the other, instead of side by side.
   */
  stacked?: boolean
}>()

// The fields' names repeat when several forms are shown.
const idPrefix = useId() + '-'

const value = defineModel<Record<string, any>>({
  default: () => {
    return {}
  },
})

// A focal point is set on its image, which the form doesn't show. An input
// whose condition doesn't hold is left out, unless it has an error to show.
const renderedConfig = computed(() =>
  props.config.filter(
    (v) =>
      v.type !== 'seed' &&
      v.type !== 'focalPoint' &&
      (isInputVisible(v, value.value) || !!props.errors?.[v.name]),
  ),
)

function updateSeed() {
  props.config.forEach((config) => {
    if (config.type === 'seed') {
      value.value[config.name] = Math.round(
        Date.now() * Math.random(),
      ).toString()
    }
  })
}

props.config.forEach((config) => {
  if ('defaultValue' in config) {
    value.value[config.name] = config.defaultValue
  }
})

updateSeed()

defineExpose({
  updateSeed,
})
</script>

<style lang="postcss">
.bk .bk-plugin-config-form {
  @apply flex flex-wrap gap-10 items-end;
  /* Spaced as FormItems are. */
  &.bk-is-stacked {
    @apply flex-col items-stretch gap-0;
  }
  > li {
    @apply flex-1 shrink;

    &.bk-is-type-options,
    &.bk-is-type-text {
      @apply min-w-[200px];
    }
    &.bk-is-type-checkbox {
      @apply flex-none;
      min-height: 46px;
      @apply flex items-center;
    }

    /* An action next to the field's input. */
    &.bk-has-action {
      @apply grid items-start;
      grid-template-columns: minmax(0, 1fr) auto;
      > * {
        grid-column: 1;
      }
      > .bk-plugin-config-form-action {
        @apply flex items-center gap-5 ml-10;
        grid-column: 2;
        grid-row: 1;
        /* Below the label, and as high as the input. */
        margin-top: 24px;
        min-height: 46px;
        &:empty {
          @apply hidden;
        }
      }
      &.bk-is-type-checkbox > .bk-plugin-config-form-action {
        @apply mt-0;
      }
    }
  }
}
</style>
