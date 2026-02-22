import { falsy } from '../../helpers'
import type { DraggableItemTypes, DraggableItem } from '../types/draggable'
import type {
  BlokkliFieldElement,
  BlokkliItemHost,
} from '#blokkli/editor/types/field'
import type { DropArea } from '#blokkli/editor/types/ui'

export type DropResolveContext<K extends keyof DraggableItemTypes> = {
  items: DraggableItemTypes[K][]
  field: BlokkliFieldElement
  host: BlokkliItemHost
  afterUuid: string | null
}

export type DropExecuteContext<K extends keyof DraggableItemTypes> =
  DropResolveContext<K> & {
    bundle: string
  }

export type DropExecuteResult = {
  /** If true, the dispatcher will focus the editable field after the block is added. */
  focusEditable?: boolean
}

export type DropHandler<K extends keyof DraggableItemTypes> = {
  /**
   * Optional. Called at drop time to refine which bundles are applicable.
   * Can read DataTransfer, detect content types, re-map via clipboardMapBundle, etc.
   * Returns the refined list of possible bundles.
   * If omitted, the overlay calls execute() directly without bundle resolution.
   */
  resolveBundles?: (ctx: DropResolveContext<K>) => string[] | Promise<string[]>

  /**
   * Called to perform the actual mutation.
   * If resolveBundles was provided, `ctx.bundle` is the resolved bundle
   * (either the single result or the user's BundleSelector pick).
   */
  execute: (
    ctx: DropExecuteContext<K>,
  ) => Promise<DropExecuteResult | undefined> | DropExecuteResult | undefined
}

type DropAreaProviderFunction = (
  items: DraggableItem[],
) => DropArea[] | DropArea | undefined

export type DragDropProvider = {
  registerDropHandler: <K extends keyof DraggableItemTypes>(
    itemType: K,
    handler: DropHandler<K>,
  ) => void
  unregisterDropHandler: <K extends keyof DraggableItemTypes>(
    itemType: K,
    handler: DropHandler<K>,
  ) => void
  getDropHandler: <K extends keyof DraggableItemTypes>(
    itemType: K,
  ) => DropHandler<K> | undefined

  /**
   * Register a drop area provider function.
   *
   * The function will be called when drop areas are requested during drag operations.
   * It receives the currently dragged items and can return drop areas where those items can be dropped.
   */
  addDropArea: (fn: DropAreaProviderFunction) => void

  /**
   * Unregister a drop area provider function.
   */
  removeDropArea: (fn: DropAreaProviderFunction) => void

  /**
   * Get all drop areas from all registered providers.
   */
  getDropAreas: (items: DraggableItem[]) => DropArea[]
}

export default function (): DragDropProvider {
  const handlers = new Map<string, DropHandler<any>>()
  let dropAreaFunctions: DropAreaProviderFunction[] = []

  const registerDropHandler = <K extends keyof DraggableItemTypes>(
    itemType: K,
    handler: DropHandler<K>,
  ) => {
    handlers.set(itemType, handler)
  }

  const unregisterDropHandler = <K extends keyof DraggableItemTypes>(
    itemType: K,
    handler: DropHandler<K>,
  ) => {
    if (handlers.get(itemType) === handler) {
      handlers.delete(itemType)
    }
  }

  const getDropHandler = <K extends keyof DraggableItemTypes>(
    itemType: K,
  ): DropHandler<K> | undefined => {
    return handlers.get(itemType) as DropHandler<K> | undefined
  }

  const addDropArea = (fn: DropAreaProviderFunction) => {
    dropAreaFunctions.push(fn)
  }

  const removeDropArea = (fn: DropAreaProviderFunction) => {
    dropAreaFunctions = dropAreaFunctions.filter((v) => v !== fn)
  }

  const getDropAreas = (items: DraggableItem[]) =>
    dropAreaFunctions
      .flatMap((fn) => {
        const v = fn(items)
        if (v) {
          return v
        }
        return null
      })
      .filter(falsy)

  return {
    registerDropHandler,
    unregisterDropHandler,
    getDropHandler,
    addDropArea,
    removeDropArea,
    getDropAreas,
  }
}
