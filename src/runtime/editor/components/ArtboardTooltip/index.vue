<template>
  <div
    ref="el"
    class="bk bk-artboard-tooltip"
    :class="[
      'bk-is-y-' + placementY,
      'bk-is-x-' + placementX,
      { 'bk-is-fullscreen': fullscreen },
    ]"
    :style="{
      '--bk-caret-x': caretX,
    }"
    @keydown="onKeyDown"
  >
    <div class="bk bk-artboard-tooltip-inner bk-caret-tooltip-inner">
      <div class="bk-artboard-tooltip-header">
        <div class="mr-auto" v-html="title" />
        <slot name="header" />
        <button :disabled="closeDisabled" @click="$emit('close')">
          <Icon :name="closeIcon" />
          <span v-if="buttonLabel">{{ buttonLabel }}</span>
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useStickyToolbar,
  type PlacementVertical,
  type PlacementHorizontal,
} from '#blokkli/editor/composables/useStickyToolbar'
import {
  useTemplateRef,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  watch,
} from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { onBlokkliEvent, useFocusTrap } from '#blokkli/editor/composables'
import type { Coord } from '#blokkli/editor/types/geometry'

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    anchorEl?: HTMLElement | null
    buttonLabel?: string
    anchorCoordinates?: Coord | null
    placementY?: PlacementVertical
    placementX?: PlacementHorizontal
    closeIcon?: BlokkliIcon
    closeDisabled?: boolean
    fullscreen?: boolean
  }>(),
  {
    anchorEl: null,
    anchorCoordinates: null,
    closeIcon: 'bk_mdi_close',
    placementY: 'auto',
    placementX: 'center',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const el = useTemplateRef('el')

const { onKeyDown } = useFocusTrap({
  container: el,
  debugLabel: 'ArtboardTooltip: ' + props.id,
})

const { ui } = useBlokkli()

const { placementY, placementX, caretX } = useStickyToolbar(el, {
  getAnchorElement() {
    return props.anchorEl ?? null
  },
  getAnchorCoordinates() {
    return props.anchorCoordinates ?? null
  },
  getPlacementY() {
    return props.placementY
  },
  getPlacementX() {
    return props.placementX
  },
  getCaretWidth() {
    return 30
  },
  isFullscreen() {
    return !!props.fullscreen
  },
})

watch(ui.openTooltip, (id) => {
  if (id !== props.id) {
    emit('close')
  }
})

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value) {
    return
  }

  if (e.code === 'Escape') {
    emit('close')
  }
})

onMounted(() => {
  ui.openTooltip.value = props.id
})

onBeforeUnmount(() => {
  if (ui.openTooltip.value === props.id) {
    ui.openTooltip.value = ''
  }
})
</script>

<style lang="postcss">
.bk.bk-artboard-tooltip {
  --bk-gap: 15px;
  --bk-caret-size: 10px;

  @apply absolute lg:absolute left-0 z-selection-add will-change-transform bottom-50 lg:bottom-auto lg:top-0 pointer-events-auto;

  &:before,
  &:after {
    content: '';
    width: 0px;
    height: 0px;
    border-style: solid;
    @apply absolute;
    transform: translateX(
      calc(((var(--bk-caret-x)) * 1px) - var(--bk-caret-size))
    );
  }

  &:before {
    --bk-header-bg: var(--bk-border);
  }

  &.bk-is-y-top {
    &:before,
    &:after {
      border-width: var(--bk-caret-size) var(--bk-caret-size) 0
        var(--bk-caret-size);
      border-color: var(--bk-header-bg) transparent transparent transparent;
      @apply top-full left-0;
    }

    &:after {
      --bk-header-bg: var(--bk-bg);
    }

    &:after {
      @apply -mt-1;
    }
  }

  &.bk-is-y-bottom {
    &:before,
    &:after {
      border-width: 0 var(--bk-caret-size) var(--bk-caret-size)
        var(--bk-caret-size);
      border-color: transparent transparent var(--bk-header-bg) transparent;
      @apply bottom-full;
    }

    &:after {
      @apply -mb-1;
    }
  }

  &.bk-is-y-center {
    /* No vertical caret when centered */
    &:before,
    &:after {
      @apply hidden;
    }
  }

  &.bk-is-x-right {
    /* Caret on left side pointing left */
    &:before,
    &:after {
      border-width: var(--bk-caret-size) var(--bk-caret-size)
        var(--bk-caret-size) 0;
      border-color: transparent var(--bk-header-bg) transparent transparent;
      @apply right-full top-1/2 left-auto;
      transform: translateX(0) translateY(-50%);
    }

    &:after {
      @apply -mr-1;
    }
  }

  &.bk-is-x-left {
    /* Caret on right side pointing right */
    &:before,
    &:after {
      border-width: var(--bk-caret-size) 0 var(--bk-caret-size)
        var(--bk-caret-size);
      border-color: transparent transparent transparent var(--bk-header-bg);
      @apply left-full top-1/2 right-auto;
      transform: translateX(0) translateY(-50%);
    }

    &:after {
      @apply -ml-1;
    }
  }

  &.bk-is-fullscreen {
    &:before,
    &:after {
      @apply hidden;
    }

    .bk-artboard-tooltip-inner {
      @apply h-full flex flex-col rounded-none;
    }
  }

  .bk-artboard-tooltip-inner {
    @apply lg:shadow-2xl;
    border: 1px solid var(--bk-border);
    background: var(--bk-bg);
  }

  .bk-artboard-tooltip-header {
    @apply flex leading-none h-40 items-center font-bold uppercase tracking-wide text-xs;
    background: var(--bk-header-bg);
    color: var(--bk-header-text);
    > div {
      padding: var(--bk-gap);
    }

    > button {
      @apply min-w-40 h-40 flex items-center justify-center px-10 gap-8;
      color: var(--bk-header-text);

      &:hover {
        background: var(--bk-header-hover);
      }

      svg {
        @apply size-18 fill-current;
      }
    }
  }
}

.bk {
  .bk-artboard-tooltip-info {
    @apply border-t border-t-mono-300 text-sm font-semibold flex items-center;
  }
  .bk-artboard-tooltip-info-button {
    @apply text-scheme-normal text-sm flex items-center gap-5;
    @apply py-[6px] px-10 h-[32px];
    @apply hover:bg-scheme-normal/10;
    @apply border-r border-r-mono-300;

    &[disabled] {
      @apply pointer-events-none text-mono-300;
    }

    svg {
      @apply size-15;
    }
  }
}
</style>
