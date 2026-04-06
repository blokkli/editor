<template>
  <div class="bk-preview">
    <div v-if="isLoading" class="bk-preview-loading">
      <Icon name="spinner" />
    </div>
    <div v-if="detached" class="bk-preview-controls">
      <slot />
    </div>
    <div
      class="bk-preview-iframe"
      :style="{
        pointerEvents: isResizing ? 'none' : 'auto',
      }"
    >
      <iframe ref="iframe" :src="src" @load="isLoading = false" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  useRoute,
  watch,
  useTemplateRef,
} from '#imports'
import { Icon } from '#blokkli/editor/components'
import { frameEventBus } from '#blokkli/editor/events'
import { onBlokkliEvent } from '#blokkli/editor/composables'

defineProps<{
  detached?: boolean
  isResizing?: boolean
}>()

const route = useRoute()

const { selection, broadcast } = useBlokkli()

watch(selection.uuids, (selectedUuids) => {
  frameEventBus.emit('selectItems', selectedUuids)
})

const isLoading = ref(true)
const iframe = useTemplateRef('iframe')

const src = computed(() =>
  route.fullPath.replace('blokkliEditing', 'blokkliPreview'),
)

onBlokkliEvent('updateMutatedFields', (e) =>
  frameEventBus.emit('mutatedFields', e.fields),
)
onBlokkliEvent('select', (uuids) => {
  const uuid = Array.isArray(uuids) ? uuids[0] : uuids
  if (uuid) {
    frameEventBus.emit('focus', uuid)
  }
})
onBlokkliEvent('option:update', (e) => frameEventBus.emit('updateOption', e))

/**
 * Emit the event to the iframe.
 */
const onFrameEventBusEvent = (name: any, data: any) =>
  iframe.value?.contentWindow?.postMessage({
    name: 'blokkli__' + name,
    data: JSON.parse(JSON.stringify(data)),
  })

const onPreviewFocused = () => {
  if (iframe.value) {
    iframe.value.focus()
  }
}

onMounted(() => {
  frameEventBus.on('*', onFrameEventBusEvent)
  broadcast.on('previewFocused', onPreviewFocused)
})

onBeforeUnmount(() => {
  frameEventBus.off('*', onFrameEventBusEvent)
  broadcast.off('previewFocused', onPreviewFocused)
})
</script>

<style lang="postcss">
.bk {
  .bk-preview {
    @apply absolute top-0 left-0 w-full h-full flex flex-col;
    .bk-preview-iframe {
      @apply relative w-full flex-1;
      iframe {
        @apply bg-white block w-full h-full;
        @apply overflow-hidden;
        @apply overflow-y-auto;
      }
    }
    .bk-preview-loading {
      @apply absolute top-0 left-0 w-full h-full z-50 bg-white/90 flex items-center justify-center backdrop-blur-lg;
      svg {
        @apply w-100 h-100 text-mono-200 animate-spin fill-mono-900;
      }
    }
  }

  .bk-preview-controls {
    @apply bg-mono-200 flex h-50;

    button,
    label {
      @apply cursor-pointer;
      @apply bg-mono-200 text-mono-500;
      @apply hover:bg-mono-300;
    }

    button {
      @apply min-w-[50px] flex;

      &:disabled {
        @apply pointer-events-none text-mono-300;
      }

      &.bk-is-rotate {
        @apply items-center justify-center;
        svg {
          @apply fill-current w-20 h-20;
        }
      }
    }

    .bk-dropdown {
      @apply flex-1 relative;
      button {
        @apply h-full w-full flex items-center pr-15;

        > .bk-icon {
          svg {
            @apply w-15 h-15;
            @apply fill-current;
          }
        }

        &.bk-is-open {
          > .bk-icon {
            @apply rotate-180;
          }
        }
      }
      label {
        @apply block;
      }
      input:not(:checked) + .bk-preview-viewport-option {
        @apply text-mono-400;
      }
      .bk-dropdown-content {
        @apply absolute top-full left-0 w-full z-50 bg-mono-800;
        input {
          @apply absolute opacity-0;
        }
      }
    }

    .bk-preview-viewport-option {
      @apply flex gap-10 items-center text-left w-full text-xs leading-none py-10 px-10;
      strong {
        @apply block mb-5;
      }
      .bk-icon {
        @apply w-25 h-25 fill-current;
      }
    }
  }

  .bk-sidebar-detached.bk-is-focused {
    .bk-preview-controls {
      @apply bg-mono-300;
      button,
      label {
        @apply bg-mono-800 hover:bg-mono-700 text-white;
      }
      .bk-is-rotate {
        @apply border-r-mono-700;
        &:disabled {
          @apply text-mono-600;
        }
      }
      input:not(:checked) + .bk-preview-viewport-option {
        @apply text-mono-500;
      }
      label:hover input:not(:checked) + .bk-preview-viewport-option {
        @apply text-mono-300;
      }
    }
  }
}
</style>
