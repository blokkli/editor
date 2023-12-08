import { eventBus } from '#blokkli/helpers/eventBus'

export type BlokkliKeyboardProvider = {
  isPressingSpace: Readonly<globalThis.Ref<boolean>>
  isPressingControl: Readonly<globalThis.Ref<boolean>>
}

export default function (): BlokkliKeyboardProvider {
  const isPressingControl = ref(false)
  const isPressingSpace = ref(false)

  const onKeyUp = (e: KeyboardEvent) => {
    isPressingControl.value =
      e.getModifierState('Control') || e.getModifierState('Meta')

    if (e.code === 'Space') {
      isPressingSpace.value = false
    }
    if (e.code === 'Control' || e.key === 'CapsLock') {
      isPressingControl.value = false
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    isPressingControl.value =
      e.getModifierState('Control') ||
      e.getModifierState('Meta') ||
      e.code === 'CapsLock'

    if (!isPressingSpace.value) {
      eventBus.emit('keyPressed', {
        code: e.key,
        shift: e.shiftKey,
        meta: e.ctrlKey || e.metaKey || isPressingControl.value,
        originalEvent: e,
      })
    }

    if (e.code === 'Space') {
      isPressingSpace.value = true
    }
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
      ? document.body.classList.add('bk-is-pressing-space')
      : document.body.classList.remove('bk-is-pressing-space'),
  )

  return {
    isPressingSpace: readonly(isPressingSpace),
    isPressingControl: readonly(isPressingControl),
  }
}
