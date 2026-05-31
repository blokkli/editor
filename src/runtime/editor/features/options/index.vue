<template>
  <Teleport to="#bk-blokkli-item-actions-controls">
    <OptionsForm
      v-if="
        definition &&
        !selection.isDragging.value &&
        !ui.isAnimating.value &&
        !ui.isTransforming.value &&
        uuids
      "
      :key="key + state.refreshKey.value + ui.isAnimating.value"
      :uuids
      :definition
    />
  </Teleport>
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  defineBlokkliFeature,
  defineAsyncComponent,
} from '#imports'
import { falsy, onlyUnique } from '#blokkli/helpers'
import type {
  BlockDefinitionInput,
  FragmentDefinitionInput,
  ProviderDefinitionInput,
} from '#blokkli/types/definitions'
import { fragmentBlockBundle } from '#blokkli-build/config'

const OptionsForm = defineAsyncComponent(() => import('./Form/index.vue'))

defineBlokkliFeature({
  id: 'options',
  label: 'Options',
  icon: 'bk_mdi_palette',
  description: 'Renders the options form for one or more blocks.',
  requiredAdapterMethods: ['updateOptions'],
})

const { selection, state, ui, definitions, context } = useBlokkli()

const uuids = computed(() => {
  const uuids = selection.items.value.map((v) => v.uuid)
  if (uuids.length) {
    return uuids
  } else if (selection.hasHostSelected.value) {
    return 'provider'
  }

  return null
})

const key = computed(() => {
  // The form remounts when the selected blocks change so it can re-capture the
  // option baseline. Pending changes are persisted before the remount via the
  // flush handler registered on the UI provider (see ./Form/index.vue), which
  // action buttons await through ui.flushPendingChanges().
  const parts: string[] = []
  if (typeof uuids.value === 'string') {
    parts.push(uuids.value)
  } else if (uuids.value && typeof uuids.value === 'object') {
    parts.push(...uuids.value)
  }

  return parts.join('-')
})

const definition = computed<
  | BlockDefinitionInput<any, any>
  | FragmentDefinitionInput<any, any>
  | ProviderDefinitionInput<any, any>
  | undefined
>(() => {
  if (uuids.value === 'provider') {
    return definitions.getProviderDefinition(
      context.value.entityType,
      context.value.entityBundle,
    )
  }

  const bundles = selection.items.value
    .map((v) => v.library?.reusableBundle || v.bundle)
    .filter(onlyUnique)

  // @TODO: Support shared global options.
  if (bundles.length !== 1) {
    return
  }

  const bundle = bundles[0]!

  if (bundle === fragmentBlockBundle) {
    const fragments = selection.items.value.filter(
      (v) => v.bundle === fragmentBlockBundle,
    )

    const fragmentNames = fragments
      .map((v) => {
        const props: any = state.getFieldListItem(v.uuid)?.props
        if (props && props.name) {
          return props.name
        }
      })
      .filter(falsy)
      .filter(onlyUnique)

    if (fragmentNames.length !== 1) {
      return
    }

    return definitions.getFragmentDefinition(fragmentNames[0])
  }

  return selection.items.value
    .map((block) => {
      return definitions.getBlockDefinition(
        bundle,
        block.fieldListType,
        block.parentBlockBundle,
      )
    })
    .filter(falsy)
    .at(0)
})
</script>

<script lang="ts">
export default {
  name: 'Options',
}
</script>

<style lang="postcss">
.bk {
  .bk-blokkli-item-options {
    @apply flex min-w-[100vw];
    height: var(--bk-actions-height);

    @apply overflow-auto lg:overflow-visible;
    @apply lg:border-l lg:border-l-mono-700;
    @apply order-first min-w-full lg:min-w-[auto] lg:order-none;
    &::-webkit-scrollbar {
      display: none;
    }

    &:empty {
      @apply hidden;
    }
    &:not(:empty) {
      @apply border-b border-b-mono-500/25 lg:border-b-0;
    }
  }
  .bk-blokkli-item-options-item-content {
    @apply h-full;
  }
  .bk-blokkli-item-options-item {
    @apply relative flex items-center text-sm;
    &.bk-is-disabled {
      @apply pointer-events-none opacity-20;
    }
    &:not(:last-child) {
      @apply lg:border-r lg:border-r-mono-600;
    }
  }

  .bk-blokkli-item-options-checkbox {
    @apply relative inline-flex items-center cursor-pointer h-full px-10 text-mono-200;
    @media not all and (hover: none) {
      @apply hover:bg-mono-800 hover:text-mono-50;
    }
    input {
      @apply sr-only;
    }
    input:checked + div {
      @apply after:translate-x-full after:border-white bg-mono-500 after:bg-mono-50;
    }
    > div {
      @apply relative w-[36px] h-20 bg-mono-700 rounded-full shrink-0;
      @apply after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-mono-300 after:rounded-full after:h-[16px] after:w-[16px];
    }
    > span {
      @apply inline-block pl-10;
    }
  }

  .bk-blokkli-item-options-radios:not(.bk-is-color) {
    @apply flex items-center px-10 h-full relative;
    @apply text-mono-50  select-none text-sm;
    > label {
      @apply h-full flex items-center cursor-pointer;
      input {
        @apply sr-only;

        &:checked + span {
          @apply bg-mono-100 text-mono-900;
        }
      }
      @media not all and (hover: none) {
        &:hover input:not(:checked) + span {
          @apply bg-mono-700;
        }
      }
      span {
        @apply inline-block px-10 py-2 rounded-3xl;
      }

      &.bk-is-muted {
        @apply text-mono-500;
      }
    }
  }

  .bk-blokkli-item-options-radios.bk-is-color {
    @apply flex items-stretch h-full px-10;
    label {
      @apply cursor-pointer h-full flex items-center px-5;
      div {
        @apply relative w-20 h-20 rounded-full;
      }
      input {
        @apply mr-1 cursor-pointer;
      }
      span {
        @apply absolute top-0 text-[0px] left-0 w-full h-full rounded-[inherit] outline outline-2 outline-transparent outline-offset-2;
      }
      @media not all and (hover: none) {
        &:hover input:not(:checked) + span {
          @apply outline-mono-400;
        }
      }
      input {
        opacity: 0;
        &:checked + span {
          @apply outline-mono-50;
        }
      }
    }
  }

  .bk-blokkli-item-options-radios.bk-is-icons {
    @apply gap-10 text-white;
    .bk-blokkli-item-options-radios-icon {
      @apply opacity-30;
      svg {
        @apply h-[24px] w-auto fill-current;
        .bk-option-icon-fill {
          @apply fill-mono-700;
        }
        .bk-option-icon-fill-strong {
          @apply fill-mono-200;
        }
        .bk-option-icon-stroke {
          @apply stroke-current;
        }
      }
    }
    input:not(:checked):hover + .bk-blokkli-item-options-radios-icon {
      @apply opacity-50;
    }
    input:checked + .bk-blokkli-item-options-radios-icon {
      @apply opacity-100;
    }
  }

  .bk-blokkli-item-options-text {
    @apply cursor-pointer h-full relative;
    input {
      @apply bg-transparent h-full px-10 focus:outline-none focus:shadow-none focus:bg-mono-800 absolute top-0 left-0 w-full;
    }
    > div {
      @apply px-10 whitespace-pre pointer-events-none invisible;
      @apply min-w-[100px] max-w-[250px];
      @apply overflow-hidden;
    }

    @media not all and (hover: none) {
      &:hover {
        color: var(--gin-color-primary);
      }
    }
  }

  .bk-blokkli-item-options-date {
    @apply cursor-pointer h-full relative;
    input {
      @apply bg-transparent h-full px-10 focus:outline-none focus:shadow-none focus:bg-mono-800 accent-mono-100;
    }

    @media not all and (hover: none) {
      &:hover {
        color: var(--gin-color-primary);
      }
    }
  }

  .bk-blokkli-item-options-radios.bk-is-grid {
    .bk-blokkli-item-options-radios-flex {
      @apply flex h-20 w-60 mx-5 border border-current text-mono-500 relative;

      > div {
        @apply relative h-full bg-mono-800;
        &:not(:last-child):after {
          content: '';
          @apply absolute -top-1 right-0 -bottom-1 border-r-[1px] border-current;
        }
      }
    }

    input:checked + div {
      @apply text-white;
      > div {
        @apply bg-white;
      }
      > div:after {
        @apply !border-r-mono-950;
      }
    }
    label {
      @media not all and (hover: none) {
        &:hover input:not(:checked) + div {
          @apply text-mono-300;
          > div {
            @apply bg-mono-600;
          }
        }
      }
    }
  }

  .bk-blokkli-item-options-checkboxes {
    @apply px-15 h-full;

    &.bk-is-grouped {
      @apply h-auto px-0;
      > div {
        @apply static;
      }
    }

    @media not all and (hover: none) {
      @apply hover:bg-mono-700;
    }

    button {
      @apply flex items-center gap-10 h-full min-w-[200px];
      svg {
        fill: currentColor;
        @apply text-mono-100 w-20 h-15;
      }

      > span:first-child {
        @apply mr-auto;
      }
    }

    > div {
      @apply fixed left-0 grid bg-mono-900 overflow-hidden min-w-full;
      @apply bottom-full;
      @variant md {
        @apply absolute top-full bottom-auto;
      }
      label {
        @apply py-10;
        @media not all and (hover: none) {
          @apply hover:bg-mono-800;
        }
      }
    }

    &.bk-is-active {
      @apply bg-mono-800;
      button {
        svg {
          @apply rotate-180;
        }
      }
    }
  }

  .bk-blokkli-item-options-color {
    @apply relative px-10 h-full flex items-center cursor-pointer;

    @media not all and (hover: none) {
      @apply hover:bg-mono-700;
    }

    input {
      @apply appearance-none absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer;
    }

    .bk-blokkli-item-options-color-preview {
      @apply w-20 h-20 rounded-full;
    }

    .bk-blokkli-item-options-color-label {
      @apply font-mono ml-10;
    }
  }

  .bk-blokkli-item-options-range {
    @apply flex px-10 items-center gap-5 h-full;
    input {
      @apply w-120 appearance-none h-5 rounded-full bg-mono-500;

      /* The slider handle (use -webkit- (Chrome, Opera, Safari, Edge) and -moz- (Firefox) to override default look) */
      &::-webkit-slider-thumb {
        @apply appearance-none rounded-full bg-white;
        width: 15px; /* Set a specific slider handle width */
        height: 15px; /* Slider handle height */
        cursor: pointer; /* Cursor on hover */
      }

      &::-moz-range-thumb {
        @apply rounded-full bg-white;
        width: 15px; /* Set a specific slider handle width */
        height: 15px; /* Slider handle height */
        cursor: pointer; /* Cursor on hover */
      }
    }

    > div {
      @apply min-w-40 text-right font-mono;
    }
  }

  .bk-blokkli-item-options-group {
    @apply relative;
    > button {
      @apply flex items-center gap-10 h-full min-w-[200px] w-full px-10 text-sm;
      @media not all and (hover: none) {
        @apply hover:bg-mono-700;
      }
      .bk-icon {
        @apply ml-auto;
      }
      svg {
        fill: currentColor;
        @apply text-mono-100 w-20 h-15;
      }
    }

    &.bk-is-active {
      &:last-child {
        > button {
          @apply rounded-b-none;
        }
      }
      > button {
        @apply bg-mono-800;
        svg {
          @apply rotate-180;
        }
      }
    }
  }
  /* The last group sits at the right end of the toolbar — its popup would
   * extend past the toolbar's right edge and get clipped by
   * `.bk-blokkli-item-actions-inner`'s clip-path. Anchor it to the group's
   * right edge so it grows leftward instead. */
  .bk-blokkli-item-options-group:last-child
    > .bk-blokkli-item-options-group-content {
    @variant md {
      @apply left-auto right-0;
    }
  }
  .bk-blokkli-item-options-group-content {
    @apply absolute bottom-full left-0;
    @apply fixed left-0 grid bg-mono-900 overflow-hidden min-w-full rounded-b-none rounded-t;
    @apply bottom-full;
    @variant md {
      @apply absolute top-full bottom-auto rounded-t-none rounded-b;
    }
    > label {
      @apply py-10;
      @media not all and (hover: none) {
        @apply hover:bg-mono-800;
      }
    }
    .bk-blokkli-item-options-item-content {
      @apply h-50;

      &.bk-is-grouped {
        @apply h-auto min-h-50 w-full;

        .bk-blokkli-item-options-checkbox {
          @apply h-50 w-full whitespace-nowrap;
        }
      }
    }

    .bk-blokkli-item-options-item {
      @apply flex flex-col items-start;
      &:not(:last-child) {
        @apply border-b border-b-mono-600;
      }
      .bk-blokkli-item-options-item-label {
        @apply px-10 font-semibold text-mono-300 mt-10;
      }
    }
  }

  .bk-blokkli-item-options-complex-type {
    @apply flex items-center gap-10 h-full px-10 cursor-pointer text-sm whitespace-nowrap font-medium text-mono-300;
    @media not all and (hover: none) {
      @apply hover:bg-mono-700 hover:text-mono-50;
    }
    .bk-icon {
      @apply size-24 fill-current;
    }
  }

  .bk-blokkli-item-options-number {
    @apply h-full relative flex px-10 items-center;
    input {
      @apply appearance-none bg-transparent h-full focus:outline-0 focus:border-none focus:shadow-none font-mono text-center;

      &::-webkit-inner-spin-button {
        @apply appearance-none w-0 h-0 hidden;
      }
    }

    button {
      @apply w-20 h-20 flex items-center justify-center rounded-full;
      @apply hover:bg-mono-700;

      &[disabled] {
        @apply pointer-events-none bg-transparent text-mono-600;
      }
      .bk-icon {
        @apply w-15 h-15 fill-current;
      }
    }
  }
}
</style>
