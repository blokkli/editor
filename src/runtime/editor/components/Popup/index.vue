<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="drop-up">
      <ViewportBlockingRect
        v-if="shouldRender"
        :id="'popup-' + id"
        class="bk bk-popup"
        :class="['bk-is-' + position, 'bk-is-' + id]"
      >
        <div class="bk-popup-title">
          <h2>{{ title }}</h2>
          <button class="bk-popup-close" @click="onClose">
            <Icon name="bk_mdi_close" />
          </button>
        </div>

        <div class="bk-popup-content">
          <div class="bk-popup-content-text">
            <slot>
              <p v-if="text" v-html="text" />
            </slot>
          </div>

          <button class="bk-button" @click="onSubmit" :class="'bk-is-' + theme">
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
import { onBeforeUnmount, onMounted, ref, useBlokkli } from '#imports'

const props = defineProps<{
  id: string
  title: string
  text?: string
  cta: string
  theme: 'default' | 'warning' | 'primary' | 'danger' | 'lime'
  position: 'top-left' | 'bottom-right'
}>()

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
