import { onBeforeUnmount, useBlokkli } from '#imports'
import type { Renderer } from '../providers/animation'

/**
 * Register a WebGL renderer with automatic cleanup on unmount.
 *
 * @param id - Unique identifier for the renderer
 * @param config - Renderer configuration (zIndex, enabled, render, collector)
 * @returns Object containing the collector instance with inferred type
 */
export async function defineRenderer<T>(
  id: string,
  config: Omit<Renderer<T>, 'id'>,
): Promise<{ collector: T }> {
  const { animation } = useBlokkli()

  onBeforeUnmount(() => {
    unregister()
  })

  // Register the renderer and get the collector instance
  const { collector, unregister } = await animation.registerRenderer(id, config)

  // Return the collector with inferred type
  return { collector }
}
