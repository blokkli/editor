import { eventBus } from '../eventBus'

export default function () {
  const isPressingControl = ref(false)
  const isPressingSpace = ref(false)
  function onKeyUp() {
    isPressingControl.value = false
    isPressingSpace.value = false
  }
  function onKeyDown(e: KeyboardEvent) {
    // For the one person that remapped caps lock to control.
    if (e.key === 'Control' || e.key === 'CapsLock') {
      isPressingControl.value = true
    } else if (e.code === 'Space') {
      isPressingSpace.value = true
    }

    eventBus.emit('keyPressed', {
      code: e.key,
      shift: e.shiftKey,
      meta: e.ctrlKey,
      originalEvent: e,
    })
  }
  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
  })

  watch(isPressingSpace, (has) =>
    has
      ? document.body.classList.add('pb-is-pressing-space')
      : document.body.classList.remove('pb-is-pressing-space'),
  )

  return { isPressingSpace, isPressingControl }
}
