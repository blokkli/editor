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

  // Handle the race where the component unmounts before registration resolves:
  // onBeforeUnmount fires, the id isn't in the renderer map yet, then registration
  // completes and would leak a renderer. Track unmount state and clean up after.
  let unmounted = false
  onBeforeUnmount(() => {
    unmounted = true
    animation.unregisterRenderer(id)
  })

  const { collector } = await animation.registerRenderer(id, config)

  if (unmounted) {
    animation.unregisterRenderer(id)
  }

  return { collector }
}
