<template>
  <Transition :css="false" @enter="enterTransition" @leave="leaveTransition">
    <slot />
  </Transition>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /**
     * The duration of the transition.
     */
    duration?: number

    /**
     * Whether to also transition the opacity.
     * If set, the element is transitioned from 0 to 1 and vice versa.
     */
    opacity?: boolean

    /**
     * The easing function when entering.
     */
    easingEnter?: string

    /**
     * The easing function when leaving.
     */
    easingLeave?: string
  }>(),
  {
    duration: 200,
    opacity: false,
    easingEnter: 'ease-in-out',
    easingLeave: 'ease-in-out',
  },
)

type InitialStyle = {
  height: string
  width: string
  position: string
  visibility: string
  overflow: string
  paddingTop: string
  paddingBottom: string
  borderTopWidth: string
  borderBottomWidth: string
  marginTop: string
  marginBottom: string
}

const getElementStyle = (element: HTMLElement): InitialStyle => {
  return {
    height: element.style.height,
    width: element.style.width,
    position: element.style.position,
    visibility: element.style.visibility,
    overflow: element.style.overflow,
    paddingTop: element.style.paddingTop,
    paddingBottom: element.style.paddingBottom,
    borderTopWidth: element.style.borderTopWidth,
    borderBottomWidth: element.style.borderBottomWidth,
    marginTop: element.style.marginTop,
    marginBottom: element.style.marginBottom,
  }
}

const prepareElement = (element: HTMLElement, initialStyle: InitialStyle) => {
  const { width } = getComputedStyle(element)
  element.style.width = width
  element.style.position = 'absolute'
  element.style.visibility = 'hidden'
  element.style.height = ''

  const { height } = getComputedStyle(element)
  element.style.width = initialStyle.width
  element.style.position = initialStyle.position
  element.style.visibility = initialStyle.visibility
  element.style.height = '0px'
  element.style.overflow = 'hidden'
  return initialStyle.height && initialStyle.height !== '0px'
    ? initialStyle.height
    : height
}

const animateTransition = (
  element: HTMLElement,
  initialStyle: InitialStyle,
  done: () => void,
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  options?: number | KeyframeAnimationOptions,
) => {
  const animation = element.animate(keyframes, options)
  // Set height to 'auto' to restore it after animation
  element.style.height = initialStyle.height
  animation.onfinish = () => {
    element.style.overflow = initialStyle.overflow
    done()
  }
}

const getEnterKeyframes = (height: string, initialStyle: InitialStyle) => [
  {
    height: '0px',
    opacity: props.opacity ? 0 : 1,
    paddingTop: '0px',
    paddingBottom: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    marginTop: '0px',
    marginBottom: '0px',
  },
  {
    height,
    opacity: props.opacity ? 1 : 1,
    paddingTop: initialStyle.paddingTop,
    paddingBottom: initialStyle.paddingBottom,
    borderTopWidth: initialStyle.borderTopWidth,
    borderBottomWidth: initialStyle.borderBottomWidth,
    marginTop: initialStyle.marginTop,
    marginBottom: initialStyle.marginBottom,
  },
]

const enterTransition = (element: Element, done: () => void) => {
  if (!(element instanceof HTMLElement)) {
    return done()
  }

  const initialStyle = getElementStyle(element)
  const height = prepareElement(element, initialStyle)
  const keyframes = getEnterKeyframes(height, initialStyle)
  const options = { duration: props.duration, easing: props.easingEnter }
  animateTransition(element, initialStyle, done, keyframes, options)
}

const leaveTransition = (element: Element, done: () => void) => {
  if (!(element instanceof HTMLElement)) {
    return done()
  }

  const initialStyle = getElementStyle(element)
  const { height } = getComputedStyle(element)
  element.style.height = height
  element.style.overflow = 'hidden'

  const keyframes = getEnterKeyframes(height, initialStyle).reverse()
  const options = { duration: props.duration, easing: props.easingLeave }

  animateTransition(element, initialStyle, done, keyframes, options)
}
</script>
