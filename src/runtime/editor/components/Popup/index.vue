<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="drop-up">
      <ViewportBlockingRect
        v-if="shouldRender"
        :id="'popup-' + id"
        class="bk bk-popup"
        :class="['bk-is-' + position, 'bk-is-' + id]"
        :data-test-popup="id"
      >
        <div class="bk-popup-title">
          <h2>{{ title }}</h2>
          <button
            class="p-20 hover:bg-mono-50 text-mono-500"
            :data-test-popup-close="id"
            @click="onClose"
          >
            <Icon name="bk_mdi_close" class="size-20" />
          </button>
        </div>

        <div class="bk-popup-content">
          <div class="bk-popup-content-text">
            <slot>
              <p v-if="text" v-html="text" />
            </slot>
          </div>

          <button class="bk-button" :class="themeClass" @click="onSubmit">
            {{ cta }}
          </button>
        </div>
      </ViewportBlockingRect>
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  Icon,
  ViewportBlockingRect,
  BlokkliTransition,
} from '#blokkli/editor/components'
import { computed, onBeforeUnmount, onMounted, ref, useBlokkli } from '#imports'

const props = defineProps<{
  id: string
  title: string
  text?: string
  cta: string
  theme: 'default' | 'warning' | 'primary' | 'danger' | 'lime'
  position: 'top-left' | 'bottom-right'
}>()

const themeClass = computed(() => {
  switch (props.theme) {
    case 'primary':
      return 'bk-scheme-accent'
    case 'danger':
      return 'bk-scheme-red'
    case 'warning':
      return 'bk-scheme-yellow'
    case 'lime':
      return 'bk-scheme-lime'
    default:
      return 'bk-scheme-mono'
  }
})

const { ui, storage } = useBlokkli()

const hasClosed = storage.use(`popup:${props.id}:closed`, false)

const shouldRender = ref(false)
let timeout: number | null = null

const emit = defineEmits(['submit', 'close'])

function closePopup() {
  hasClosed.value = true
  shouldRender.value = false
}

function onSubmit() {
  closePopup()
  emit('submit')
}

function onClose() {
  closePopup()
  emit('close')
}

defineExpose({
  closePopup,
})

onMounted(() => {
  if (hasClosed.value) {
    return
  }

  timeout = window.setTimeout(() => {
    shouldRender.value = true
  }, 1000)
})

onBeforeUnmount(() => {
  if (timeout) {
    window.clearTimeout(timeout)
    timeout = null
  }
})
</script>

<style lang="postcss">
.bk.bk-popup {
  @apply relative w-full bg-white shadow-xl  hyphens-auto;
  @apply z-tour-popup pointer-events-auto;
  @apply border border-mono-200 overflow-hidden;
  grid-area: viewport;

  &.bk-is-top-left {
    @apply self-start justify-self-start;
  }

  &.bk-is-bottom-right {
    @apply self-end justify-self-end;
  }

  @variant lg {
    @apply w-[360px] rounded m-20;
  }

  @variant xl {
    @apply w-[400px];
  }

  h2 {
    @apply font-bold lg:text-xl;
  }

  .bk-button {
    @apply w-full mt-20;
  }

  .bk-popup-title {
    @apply flex justify-between items-center pl-20 border-b border-b-mono-200;
  }

  .bk-popup-content {
    @apply p-20;
  }
}
</style>
