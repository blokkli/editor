import {
  onMounted,
  onBeforeUnmount,
  toValue,
  useBlokkli,
  watch,
} from '#imports'
import type { MaybeRefOrGetter } from 'vue'
import { onBlokkliEvent } from './onBlokkliEvent'

export type UseDismissOptions = {
  /** Boundary element; interactions outside it dismiss. Ref or getter. */
  element: MaybeRefOrGetter<HTMLElement | null | undefined>

  /**
   * Called when a dismiss condition (outside click, canvas clickAway, Escape
   * or a selection change) fires.
   */
  onDismiss: () => void

  /** Dismiss on Escape (unless a dialog is open). Defaults to true. */
  escape?: boolean

  /**
   * An additional element whose clicks should NOT dismiss — typically the
   * trigger that toggles the dismissable element.
   *
   * Needed because the document click listener runs in the capture phase: the
   * trigger's own `@click.stop` can't prevent it, so without this a click on
   * the trigger would dismiss and then immediately re-open.
   */
  ignore?: MaybeRefOrGetter<HTMLElement | null | undefined>
}

/**
 * Close a floating element (dropdown, menu, popover) when the user clicks
 * outside of it, presses Escape, or changes the editor selection.
 *
 * @example
 * const root = useTemplateRef('root')
 * useDismiss({ element: root, onDismiss: () => emit('close') })
 */
export function useDismiss(options: UseDismissOptions) {
  const { ui, selection } = useBlokkli()

  const onDocumentClick = (e: MouseEvent) => {
    const el = toValue(options.element)
    if (!el) {
      return
    }
    const target = e.target as Node
    if (el.contains(target)) {
      return
    }
    const ignore = toValue(options.ignore)
    if (ignore && ignore.contains(target)) {
      return
    }
    options.onDismiss()
  }

  onBlokkliEvent('keyPressed', (e) => {
    if (options.escape === false || ui.hasDialogOpen.value) {
      return
    }
    if (e.code === 'Escape') {
      options.onDismiss()
    }
  })

  onBlokkliEvent('window:clickAway', options.onDismiss)
  watch(selection.uuids, options.onDismiss)
  watch(selection.isDragging, options.onDismiss)

  onMounted(() =>
    document.addEventListener('click', onDocumentClick, { capture: true }),
  )
  onBeforeUnmount(() =>
    document.removeEventListener('click', onDocumentClick, { capture: true }),
  )
}
