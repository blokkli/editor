import { onBeforeUnmount, useBlokkli } from '#imports'
import type { Renderer } from '../animationProvider'

/**
 * Register a WebGL renderer with automatic cleanup on unmount.
 *
 * @param id - Unique identifier for the renderer
 * @param config - Renderer configuration (zIndex, enabled, render, collector)
 * @returns Object containing the collector instance with inferred type
 */
export default function defineRenderer<T>(
  id: string,
  config: Omit<Renderer<T>, 'id'>,
): { collector: T } {
  const { animation } = useBlokkli()

  // Register the renderer and get the collector instance
  const { collector, unregister } = animation.registerRenderer(id, config)

  onBeforeUnmount(() => {
    unregister()
  })

  // Return the collector with inferred type
  return { collector }
}
