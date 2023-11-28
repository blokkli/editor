import { eventBus } from '../eventBus'

export default function () {
  const isPressingControl = ref(false)
  const isPressingSpace = ref(false)
  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      isPressingSpace.value = false
    }
    if (e.code === 'Control' || e.key === 'CapsLock') {
      isPressingControl.value = false
    }
    isPressingControl.value =
      e.getModifierState('Control') || e.getModifierState('Meta')
  }
  function onKeyDown(e: KeyboardEvent) {
    isPressingControl.value =
      e.getModifierState('Control') || e.getModifierState('Meta')
    if (e.code === 'Space') {
      isPressingSpace.value = true
    }

    eventBus.emit('keyPressed', {
      code: e.key,
      shift: e.shiftKey,
      meta: e.ctrlKey || e.metaKey,
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
