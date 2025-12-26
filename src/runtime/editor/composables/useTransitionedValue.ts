import { computed, watch } from 'vue'
import type { RGB } from './../../../shared/types/theme'
import { easeOutQuad } from './../../helpers/easing'

interface TransitionOptions {
  /**
   * Duration in milliseconds.
   */
  duration?: number

  /**
   * The easing method. Defaults to "ease out quad".
   */
  easing?: (t: number) => number
}

function isRGB(value: RGB | number): value is RGB {
  return Array.isArray(value) && value.length === 3
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function interpolateColor(from: RGB, to: RGB, t: number): RGB {
  return [
    lerp(from[0], to[0], t),
    lerp(from[1], to[1], t),
    lerp(from[2], to[2], t),
  ]
}

function interpolateValue<T extends RGB | number>(
  from: T,
  to: T,
  t: number,
): T {
  if (isRGB(from) && isRGB(to)) {
    return interpolateColor(from, to, t) as T
  } else if (typeof from === 'number' && typeof to === 'number') {
    return lerp(from, to, t) as T
  }

  return to
}

function cloneValue<T extends RGB | number>(value: T): T {
  if (isRGB(value)) {
    return [...value] as T
  }
  return value
}

/**
 * Creates a computed property from the given callback and transitions between values.
 *
 * Returns a method that, when called, will return the current transitioned value.
 */
export function useTransitionedValue<T extends RGB | number>(
  valueCallback: () => T,
  options: TransitionOptions = {},
) {
  const { duration = 300, easing = easeOutQuad } = options

  const value = computed(valueCallback)
  const initial = value.value

  let current: T = cloneValue(initial)
  let target: T = cloneValue(initial)
  let from: T = cloneValue(initial)
  let startTime: number | null = null

  watch(value, (newValue) => {
    from = cloneValue(current)
    target = cloneValue(newValue)
    startTime = Date.now()
  })

  return function getCurrentValue(): T {
    if (startTime !== null) {
      const elapsed = Date.now() - startTime
      const rawProgress = Math.min(elapsed / duration, 1)

      if (rawProgress >= 1) {
        current = cloneValue(target)
        startTime = null
      } else {
        const easedProgress = easing(rawProgress)
        current = interpolateValue(from, target, easedProgress)
      }
    }

    return current
  }
}
