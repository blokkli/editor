export type IframeViewport = {
  /**
   * The human-readable label for this viewport preset.
   */
  label: string

  /**
   * The container width in pixels.
   */
  width: number
}

export type IframesModuleOptions = {
  /**
   * Viewport presets keyed by identifier.
   *
   * Keys are used internally, values define the label and container width
   * shown in the iframe heights editor.
   */
  viewports: Record<string, IframeViewport>
}
