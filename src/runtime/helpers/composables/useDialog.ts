import { computed, useBlokkli, type WritableComputedRef } from '#imports'

export function useDialog(id: string): WritableComputedRef<boolean> {
  const { ui } = useBlokkli()

  return computed<boolean>({
    get() {
      return ui.currentDialog.value === id
    },
    set(isOpen) {
      if (isOpen) {
        ui.openDialog(id)
      } else {
        ui.closeDialog(id)
      }
    },
  })
}
