import { computed, useBlokkli, type WritableComputedRef } from '#imports'
import type { GlobalUiDialog } from '../types/ui'

export function useDialog(
  id: string,
  alignment: GlobalUiDialog['alignment'],
): WritableComputedRef<boolean> {
  const { ui } = useBlokkli()

  return computed<boolean>({
    get() {
      return ui.currentDialog.value?.id === id
    },
    set(isOpen) {
      if (isOpen) {
        ui.openDialog({ id, alignment })
      } else {
        ui.closeDialog(id)
      }
    },
  })
}
