<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <Transition name="bk-library-edit-header">
      <div
        v-show="isLoaded"
        class="bk bk-nested-editor-overlay"
        :class="'bk-is-' + theme"
      >
        <Icon :name="icon" />
        <header>
          <h2>
            <span>{{ title }}</span>
          </h2>
          <button @click.prevent="closeOverlay">
            <Icon name="bk_mdi_arrow_left_alt" />
            <span>{{ $t('libraryItemEditOverlayBack', 'Back to page') }}</span>
          </button>
        </header>
      </div>
    </Transition>
    <Transition
      :css="false"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfter"
      @enter-cancelled="onAfter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
      @leave-cancelled="onAfterLeave"
    >
      <div
        v-show="isLoaded"
        class="bk bk-library-edit-overlay"
        :class="'bk-is-' + theme"
      >
        <iframe
          ref="iframe"
          :src="url"
          style="width: 100%; height: 100%"
          @load="onLoad"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  onBeforeUnmount,
  onMounted,
  ref,
  useBlokkli,
  useTemplateRef,
} from '#imports'
import { Icon } from '#blokkli/editor/components'
import { onBroadcastEvent } from '#blokkli/editor/composables'
import type { BlokkliIcon } from '#blokkli-build/icons'

export type NestedEditorOverlayProps = {
  url: string
  uuid: string
  title: string
  theme: 'lime' | 'red'
  icon: BlokkliIcon
  blockUuid?: string
  element?: HTMLElement | null
}

const props = defineProps<NestedEditorOverlayProps>()

const { $t, ui, dom, blocks } = useBlokkli()
const DURATION = 600
const emit = defineEmits(['submit', 'close'])

function getOriginatingElement(): HTMLElement | null {
  if (props.element) {
    return props.element
  }
  if (props.blockUuid) {
    const block = blocks.getBlock(props.blockUuid)
    if (block) {
      return dom.getDragElement(block) ?? null
    }
  }

  return null
}

const FADE_DURATION = 150
const EASING = 'cubic-bezier(0.56, 0.04, 0.25, 1)'

let pendingTimeouts: number[] = []
let raf: number | null = null

function cancelPendingTimeouts() {
  pendingTimeouts.forEach((id) => window.clearTimeout(id))
  pendingTimeouts = []
}

function withTimeout(callback: () => void, duration: number) {
  const id = window.setTimeout(callback, duration)
  pendingTimeouts.push(id)
}

// Called before the element is inserted/shown.
// Use this to set initial styles before any paint.
function onBeforeEnter(el: Element) {
  cancelPendingTimeouts()
  if (el instanceof HTMLElement) {
    // Set transition to none so styles apply instantly
    el.style.transition = 'none'
    el.style.opacity = '0'
  }
}

// called one frame after the element is inserted.
// use this to start the entering animation.
function onEnter(el: Element, done: () => void) {
  isLoading.value = false
  if (raf) {
    window.cancelAnimationFrame(raf)
  }

  if (!(el instanceof HTMLElement)) {
    done()
    return
  }

  const originating = getOriginatingElement()
  if (!originating) {
    done()
    return
  }

  const originatingRect = originating.getBoundingClientRect()
  const overlayRect = el.getBoundingClientRect()

  // Calculate scale to match originating element's size
  const scaleX = originatingRect.width / overlayRect.width
  const scaleY = originatingRect.height / overlayRect.height

  // Calculate translation to position overlay at originating element
  const offsetX = originatingRect.x - overlayRect.x
  const offsetY = originatingRect.y - overlayRect.y

  // Set initial state with no transition
  el.style.transition = 'none'
  el.style.opacity = '0'
  el.style.transformOrigin = '0px 0px'
  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`

  // Force reflow to ensure initial state is painted
  el.getBoundingClientRect()

  // Start animation in next frame
  raf = requestAnimationFrame(() => {
    // First: fade in
    el.style.transition = `opacity ${FADE_DURATION}ms ease-out`
    el.style.opacity = '1'

    // After fade completes, do transform
    withTimeout(() => {
      el.style.transition = `transform ${DURATION}ms ${EASING}`
      el.style.transform = 'translate(0px, 0px) scale(1, 1)'

      withTimeout(() => {
        pendingTimeouts = []
        done()
      }, DURATION)
    }, FADE_DURATION)
  })
}

// called when the enter transition has finished.
function onAfter(el: Element) {
  if (el instanceof HTMLElement) {
    el.style.transform = ''
    el.style.transition = ''
    el.style.opacity = ''
    el.style.transformOrigin = ''
  }
  pendingTimeouts = []
}

function onBeforeLeave(el: Element) {
  cancelPendingTimeouts()
  if (el instanceof HTMLElement) {
    // Start from visible state
    el.style.transform = 'none'
    el.style.opacity = '1'
  }
}

// called when the leave transition starts.
// use this to start the leaving animation.
function onLeave(el: Element, done: () => void) {
  if (raf) {
    window.cancelAnimationFrame(raf)
  }

  if (!(el instanceof HTMLElement)) {
    done()
    return
  }

  const originating = getOriginatingElement()
  if (!originating) {
    done()
    return
  }

  const originatingRect = originating.getBoundingClientRect()
  const overlayRect = el.getBoundingClientRect()

  // Calculate scale to match originating element's size
  const scaleX = originatingRect.width / overlayRect.width
  const scaleY = originatingRect.height / overlayRect.height

  // Calculate translation to position overlay at originating element
  const offsetX = originatingRect.x - overlayRect.x
  const offsetY = originatingRect.y - overlayRect.y

  // First: do the transform
  el.style.transition = `transform ${DURATION}ms ${EASING}`
  el.style.transformOrigin = '0px 0px'
  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`

  // After transform completes, fade out
  withTimeout(() => {
    el.style.transition = `opacity ${FADE_DURATION}ms ease-out`
    el.style.opacity = '0'

    withTimeout(() => {
      pendingTimeouts = []
      done()
    }, FADE_DURATION)
  }, DURATION)
}

function onAfterLeave(el: Element) {
  onAfter(el)
  pendingTimeouts = []
  if (raf) {
    window.cancelAnimationFrame(raf)
    raf = null
  }
  if (hasPublished.value) {
    emit('submit')
  } else {
    emit('close')
  }
}

const iframe = useTemplateRef('iframe')
const isLoaded = ref(false)
const isLoading = ref(true)
const hasPublished = ref(false)

function onPublished({ uuid }: { uuid: string }) {
  if (props.uuid === uuid) {
    hasPublished.value = true
    isLoaded.value = false
  }
}

function onLoad() {
  if (!iframe.value) {
    return
  }

  iframe.value.focus()

  iframe.value.contentWindow?.focus()
}

function closeOverlay() {
  hasPublished.value = false
  isLoaded.value = false
}

function onClosed({ uuid }: { uuid: string }) {
  if (props.uuid === uuid) {
    closeOverlay()
  }
}

function onEditorLoaded({ uuid }: { uuid: string }) {
  if (props.uuid === uuid) {
    isLoaded.value = true
  }
}

onMounted(() => {
  isLoaded.value = true
  ui.setNestedEditor(props.uuid)
})

onBeforeUnmount(() => {
  ui.setNestedEditor(null)
})

onBroadcastEvent('published', onPublished)
onBroadcastEvent('closeEditor', onClosed)
onBroadcastEvent('editorLoaded', onEditorLoaded)
</script>
