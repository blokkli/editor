import { nextTick } from '#imports'

export function renderCycle(): Promise<void> {
  return new Promise((resolve) => {
    nextTick(() => {
      window.requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}
