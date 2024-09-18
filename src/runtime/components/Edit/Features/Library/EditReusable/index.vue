<template>
  <Teleport to="body">
    <Loading v-if="isLoading" />
    <Transition name="bk-library-edit-header">
      <header v-show="isLoaded" class="bk bk-library-edit-overlay-header">
        <h2>
          <span>{{
            $t('libraryItemEditOverlayTitle', 'Edit reusable block')
          }}</span>
          <span v-if="label">&nbsp;{{ label }}</span>
        </h2>
        <button @click.prevent="closeOverlay">
          <Icon name="arrow-left" />
          <span>{{ $t('libraryItemEditOverlayBack', 'Back to page') }}</span>
        </button>
      </header>
    </Transition>
    <Transition
      :css="false"
      @enter="onEnter"
      @after-enter="onAfter"
      @enter-cancelled="onAfter"
      @leave="onLeave"
      @after-leave="onAfterLeave"
      @leave-cancelled="onAfterLeave"
    >
      <div v-show="isLoaded" class="bk bk-library-edit-overlay">
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
import onBroadcastEvent from '#blokkli/helpers/composables/onBroadcastEvent'
import { ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import Loading from './../../../Loading/index.vue'

const props = defineProps<{
  url: string
  uuid: string
  label?: string
}>()

const DURATION = 530
const emit = defineEmits(['submit', 'close'])

function getOriginatingElement(): HTMLElement | null {
  const el = document.querySelector(
    `[data-bk-library-item-uuid="${props.uuid}"]`,
  )
  if (el instanceof HTMLElement) {
    return el
  }

  return null
}

// called one frame after the element is inserted.
// use this to start the entering animation.
function onEnter(el: Element, done: () => void) {
  if (el instanceof HTMLElement) {
    const originating = getOriginatingElement()
    if (!originating) {
      done()
      isLoading.value = false
      return
    }

    const originatingRect = originating.getBoundingClientRect()
    const overlayRect = el.getBoundingClientRect()

    const offsetX =
      originatingRect.x - overlayRect.x + originatingRect.width / 2
    const offsetY =
      originatingRect.y - overlayRect.y + originatingRect.height / 2

    el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0, 0)`

    setTimeout(() => {
      el.style.transitionDuration = DURATION + 'ms'
      el.style.transitionTimingFunction = 'cubic-bezier(0.56, 0.04, 0.25, 1)'
      el.style.transitionProperty = 'transform'
      el.style.transformOrigin = '0px 0px'
      el.style.transform = 'translate(0px, 0px)'
    }, 10)

    setTimeout(() => {
      done()
      isLoading.value = false
    }, DURATION)
  }
}

// called when the enter transition has finished.
function onAfter(el: Element) {
  if (el instanceof HTMLElement) {
    el.style.transform = ''
    el.style.transitionDuration = ''
    el.style.opacity = ''
    el.style.transitionProperty = ''
    el.style.transitionTimingFunction = ''
    el.style.transformOrigin = ''
  }
}

// called when the leave transition starts.
// use this to start the leaving animation.
function onLeave(el: Element, done: () => void) {
  if (el instanceof HTMLElement) {
    const originating = getOriginatingElement()
    if (!originating) {
      done()
      return
    }

    const originatingRect = originating.getBoundingClientRect()
    const overlayRect = el.getBoundingClientRect()

    const offsetX =
      originatingRect.x - overlayRect.x + originatingRect.width / 2
    const offsetY =
      originatingRect.y - overlayRect.y + originatingRect.height / 2

    el.style.transform = 'translate(0px, 0px)'

    setTimeout(() => {
      el.style.transitionDuration = DURATION + 'ms'
      el.style.transitionTimingFunction = 'cubic-bezier(0.56, 0.04, 0.25, 1)'
      el.style.transitionProperty = 'transform'
      el.style.transformOrigin = '0px 0px'
      el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0, 0)`
    }, 10)

    setTimeout(() => {
      done()
    }, DURATION)
  }
}

function onAfterLeave(el: Element) {
  onAfter(el)
  if (hasPublished.value) {
    emit('submit')
  } else {
    emit('close')
  }
}

const { $t } = useBlokkli()

const iframe = ref<HTMLIFrameElement | null>(null)
const isLoaded = ref(false)
const isLoading = ref(true)
const hasPublished = ref(false)
let timeout: any = null

function onLibraryItemPublished({ uuid }: { uuid: string }) {
  if (props.uuid === uuid) {
    hasPublished.value = true
    isLoaded.value = false
  }
}

function onLoad() {
  clearTimeout(timeout)

  timeout = window.setTimeout(() => {
    isLoaded.value = true
  }, 3000)
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

function onLibraryItemClose({ uuid }: { uuid: string }) {
  if (props.uuid === uuid) {
    closeOverlay()
  }
}

function onEditorLoaded({ uuid }: { uuid: string }) {
  if (props.uuid === uuid) {
    isLoaded.value = true
  }
}

onBroadcastEvent('published', onLibraryItemPublished)
onBroadcastEvent('closeEditor', onLibraryItemClose)
onBroadcastEvent('editorLoaded', onEditorLoaded)
</script>
