import type { AddAction } from '#blokkli/types'

type PluginAddFunction<T> = () => T | T[] | undefined
type AddActionFunction = PluginAddFunction<AddAction>

export type PluginProvider = {
  addAddAction: (fn: AddActionFunction) => void
  removeAddAction: (fn: AddActionFunction) => void
  getAddActions: () => AddAction[]
}

export default function (): PluginProvider {
  let addActions: AddActionFunction[] = []

  function addAddAction(fn: AddActionFunction) {
    addActions.push(fn)
  }

  function removeAddAction(fn: AddActionFunction) {
    addActions = addActions.filter((v) => v !== fn)
  }

  function getAddActions(): AddAction[] {
    const actions: AddAction[] = []

    for (let i = 0; i < addActions.length; i++) {
      const callback = addActions[i]
      if (!callback) {
        continue
      }

      const result = callback()

      if (!result) {
        continue
      }

      if (Array.isArray(result)) {
        actions.push(...result)
      } else {
        actions.push(result)
      }
    }

    return actions
  }

  return {
    addAddAction,
    removeAddAction,
    getAddActions,
  }
}
