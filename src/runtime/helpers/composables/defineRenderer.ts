import { onBeforeUnmount, useBlokkli } from '#imports'
import type { Renderer } from '../animationProvider'

/**
 * Register a WebGL renderer with automatic cleanup on unmount.
 *
 * @param id - Unique identifier for the renderer
 * @param config - Renderer configuration (zIndex, enabled, render)
 */
export default function defineRenderer(
  id: string,
  config: Omit<Renderer, 'id'>,
): void {
  const { animation } = useBlokkli()

  const unregisterRenderer = animation.registerRenderer(id, config)

  onBeforeUnmount(() => {
    unregisterRenderer()
  })
}
