import { useBlokkli, onMounted, type Ref } from '#imports'
import { modulo } from '#blokkli/helpers'

type FocusableElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLButtonElement
  | HTMLTextAreaElement

export type UseFocusTrapOptions = {
  /**
   * The container element to trap focus within.
   */
  container: Ref<HTMLElement | undefined | null>

  /**
   * Whether to auto-focus the first focusable element on mount.
   *
   * @default true
   */
  autoFocus?: boolean

  /**
   * Element selector for focusable elements.
   *
   * @default 'input,select,button,textarea'
   */
  selector?: string

  /**
   * Debug label for element queries.
   */
  debugLabel?: string
}

/**
 * Creates a focus trap within a container element.
 *
 * Handles Tab/Shift+Tab keyboard navigation to cycle through focusable elements,
 * and optionally auto-focuses the first element on mount.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useFocusTrap } from '#blokkli/helpers'
 *
 * const containerEl = useTemplateRef('container')
 * const { onKeyDown } = useFocusTrap({ container: containerEl })
 * </script>
 *
 * <template>
 *   <div ref="container" @keydown.stop="onKeyDown">
 *     <input type="text" />
 *     <button>Submit</button>
 *   </div>
 * </template>
 * ```
 */
export default function useFocusTrap(options: UseFocusTrapOptions) {
  const { element } = useBlokkli()

  const {
    container,
    autoFocus = true,
    selector = 'input,select,button,textarea',
    debugLabel = 'useFocusTrap',
  } = options

  /**
   * Get all focusable elements within the container.
   */
  const getFocusableElements = (): FocusableElement[] => {
    if (!container.value) {
      return []
    }
    return element.queryAll(container.value, selector, debugLabel)
  }

  /**
   * Handle Tab key navigation to cycle through focusable elements.
   */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!container.value || e.code !== 'Tab') {
      return
    }

    const prev = e.shiftKey
    const focusableElements = getFocusableElements().filter((el) => {
      if (el.tabIndex === -1) {
        return false
      }

      const style = window.getComputedStyle(el)
      if (style.pointerEvents === 'none') {
        return false
      } else if (style.display === 'none') {
        return false
      }

      return !el.disabled
    }) as HTMLElement[]

    const activeIndex = Math.max(
      focusableElements.findIndex((el) => document.activeElement === el),
      0,
    )

    const delta = prev ? -1 : 1

    const indexToFocus = modulo(activeIndex + delta, focusableElements.length)
    const elementToFocus = focusableElements[indexToFocus]

    if (elementToFocus) {
      elementToFocus.focus()
      e.preventDefault()
    }
  }

  if (autoFocus) {
    onMounted(() => {
      // Focus the first best match in the container.
      // Prefer non-button elements first.
      const focusableElements = getFocusableElements()
      const bestMatch =
        focusableElements.find((el) => !(el instanceof HTMLButtonElement)) ||
        focusableElements[0]

      if (bestMatch) {
        bestMatch.focus()
      }
    })
  }

  return {
    onKeyDown,
    getFocusableElements,
  }
}
