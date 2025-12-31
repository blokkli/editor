import type {
  PluginConfigInput,
  PluginConfigInputItem,
} from '#blokkli/editor/types/pluginConfig'

type AdapterApplyTransformPlugin = {
  pluginId: string
  uuids: string[]
  config?: PluginConfigInputItem[]
}

type AdapterApplyHostTransformPlugin = {
  pluginId: string
  config?: PluginConfigInputItem[]
}

export interface TransformPlugin {
  /**
   * The ID of the plugin.
   */
  id: string

  /**
   * The label of the transform plugin which is shown in the editor.
   */
  label: string

  /**
   * The array of bundles for which this transform plugin is available.
   */
  bundles: string[]

  /**
   * The array of bundles that the transform might create.
   */
  targetBundles?: string[]

  /**
   * The minimum number of items required.
   */
  min: number

  /**
   * The maximum number of items.
   */
  max: number

  configInputs?: PluginConfigInput[]

  description?: string

  /**
   * Whether the transform plugin supports previewing the changes first.
   *
   * If true, the plugin is expected to to defer producing any side effects
   * to when it's executed in non-preview mode.
   */
  preview?: boolean
}

export interface HostTransformPlugin {
  /**
   * The ID of the plugin.
   */
  id: string

  /**
   * The label of the transform plugin which is shown in the editor.
   */
  label: string

  configInputs?: PluginConfigInput[]

  description?: string

  /**
   * Whether the transform plugin supports previewing the changes first.
   *
   * If true, the plugin is expected to to defer producing any side effects
   * to when it's executed in non-preview mode.
   */
  preview?: boolean
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get all possible transform plugins.
     */
    getTransformPlugins?: () => Promise<TransformPlugin[]>

    /**
     * Get all possible host transform plugins.
     */
    getHostTransformPlugins?: () => Promise<HostTransformPlugin[]>

    /**
     * Apply a transform plugin.
     */
    applyTransformPlugin?: (
      e: AdapterApplyTransformPlugin,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Preview the output of a transform plugin.
     *
     * The transform plugin is expected to apply its transform without actually
     * persisting it and not creating any side effects.
     *
     * It must produce the same result when called for the "final"
     * transformation that is added to the edit state.
     */
    previewTransformPlugin?: (
      e: AdapterApplyTransformPlugin,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Apply a host transform plugin.
     */
    applyHostTransformPlugin?: (
      e: AdapterApplyHostTransformPlugin,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Preview the output of a host transform plugin.
     *
     * The transform plugin is expected to apply its transform without actually
     * persisting it and not creating any side effects.
     *
     * It must produce the same result when called for the "final"
     * transformation that is added to the edit state.
     */
    previewHostTransformPlugin?: (
      e: AdapterApplyHostTransformPlugin,
    ) => Promise<MutationResponseLike<T>>
  }
}
