<template>
  <div
    ref="el"
    class="bk bk-banner"
    :class="scheme ? 'bk-scheme-' + scheme : undefined"
  >
    <Icon :name="icon" />
    <slot>
      <p v-if="text" v-html="text" />
    </slot>
    <button v-if="button" class="bk-banner-close" @click="$emit('click')">
      {{ button }}
      <Icon name="bk_mdi_close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'
import type { ThemeColorName } from './../../../../global/types/theme'
import {
  onBeforeUnmount,
  onMounted,
  useTemplateRef,
  useBlokkli,
} from '#imports'

const props = withDefaults(
  defineProps<{
    id: string
    icon: BlokkliIcon
    text?: string
    button?: string
    scheme?: ThemeColorName
  }>(),
  {
    button: undefined,
    text: undefined,
    scheme: 'accent',
  },
)

defineEmits<{
  (e: 'click'): void
}>()

const { ui } = useBlokkli()

const el = useTemplateRef('el')

const observer = new ResizeObserver((entries) => {
  const entry = entries.at(0)
  if (!entry) {
    return
  }
  const height = Math.ceil(entry.borderBoxSize.at(0)?.blockSize ?? 0)
  ui.setBannerHeight(props.id, height)
})

onMounted(() => {
  if (el.value) {
    observer.observe(el.value)
  }
})

onBeforeUnmount(() => {
  observer.disconnect()
  ui.removeBanner(props.id)
})
</script>

<style lang="postcss">
.bk {
  .bk-banner {
    @apply bg-scheme-normal text-scheme-text text-xs md:text-base mx-10 mb-10;
    @apply rounded-md;
    @apply p-10 order-10 shadow-xl overflow-hidden;
    @apply border border-scheme-dark/40;

    @screen lg {
      @apply min-h-[50px] flex items-center;
    }

    > .bk-icon {
      @apply items-center justify-center mr-10 hidden lg:flex;
      svg {
        @apply w-25 h-25 fill-current;
      }
    }

    .bk-banner-close {
      @apply flex items-center lg:justify-center lg:ml-auto font-bold font-sans;
      @apply w-full lg:w-auto text-left mt-5 lg:mt-0;
      @apply text-current;
      @apply text-scheme-light;
      @apply bg-scheme-dark/90 hover:bg-scheme-dark/50;
      @apply py-10 px-10;
      @apply rounded-md;
      @apply gap-5;
      @apply text-base !leading-none;

      svg {
        @apply size-15 fill-current;
      }
    }
  }
}
</style>
