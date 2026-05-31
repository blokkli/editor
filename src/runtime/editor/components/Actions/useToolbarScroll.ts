import type { Ref } from 'vue'
import { ref, computed, onBeforeUnmount } from '#imports'
import { onElementResize } from '#blokkli/editor/composables'

const LG_MEDIA_QUERY = '(min-width: 1024px)'
const SCROLL_SPEED_PX_PER_SEC = 1400
// Reserve the width of one ScrollArrow (matches `w-60` in ScrollArrow/index.vue)
// on each side so a target brought into view isn't visually under the gradient
// or covered by the arrow itself.
const ARROW_OVERLAP_PX = 60

export type UseToolbarScrollOptions = {
  viewportEl: Readonly<Ref<HTMLElement | null>>
  contentEl: Readonly<Ref<HTMLElement | null>>
}

/**
 * Drives horizontal scroll of the actions toolbar's inner content via a
 * transform translate, exposing arrow visibility flags and press-and-hold
 * scroll controls.
 *
 * The viewport caps at the editor's safe area on desktop; when the content
 * (icons, options, action buttons) is wider, the user scrolls by pressing
 * and holding the arrow buttons rendered on the viewport edges. The
 * underlying transform is applied without a CSS transition so selection
 * changes don't animate back to zero. Mobile is unaffected — the options
 * strip keeps its own native horizontal overflow there.
 */
export function useToolbarScroll(options: UseToolbarScrollOptions) {
  const scrollX = ref(0)
  const viewportWidth = ref(0)
  const contentWidth = ref(0)
  const isLg = ref(
    typeof window !== 'undefined'
      ? window.matchMedia(LG_MEDIA_QUERY).matches
      : false,
  )

  const maxScroll = computed(() => {
    if (!isLg.value) {
      return 0
    }
    return Math.max(0, contentWidth.value - viewportWidth.value)
  })

  const showLeft = computed(() => maxScroll.value > 0 && scrollX.value > 0)
  const showRight = computed(
    () => maxScroll.value > 0 && scrollX.value < maxScroll.value,
  )

  function clamp() {
    if (scrollX.value > maxScroll.value) {
      scrollX.value = maxScroll.value
    } else if (scrollX.value < 0) {
      scrollX.value = 0
    }
  }

  let rafId: number | null = null
  let lastTime: number | null = null
  let currentDirection = 0

  function tick(now: number) {
    if (lastTime === null) {
      lastTime = now
    }
    const dt = (now - lastTime) / 1000
    lastTime = now

    const next = Math.max(
      0,
      Math.min(
        maxScroll.value,
        scrollX.value + currentDirection * SCROLL_SPEED_PX_PER_SEC * dt,
      ),
    )
    scrollX.value = next

    // Stop once we hit the edge in the active direction — there's nothing
    // more to reveal that way.
    if (
      (currentDirection < 0 && next === 0) ||
      (currentDirection > 0 && next >= maxScroll.value)
    ) {
      stopScroll()
      return
    }

    rafId = window.requestAnimationFrame(tick)
  }

  function startScroll(direction: -1 | 1) {
    if (rafId !== null) {
      return
    }
    currentDirection = direction
    lastTime = null
    rafId = window.requestAnimationFrame(tick)
  }

  function stopScroll() {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
    lastTime = null
    currentDirection = 0
  }

  /**
   * Adjust scrollX so `element` is fully visible inside the toolbar, clear of
   * the arrow-button overlap zones. No-op if there's nothing to scroll, or if
   * the element isn't part of the toolbar tree.
   *
   * Group popups are absolute-positioned descendants of their group button
   * inside the toolbar — so scrolling the toolbar shifts the popup with it.
   * That means a popup label past the viewport's right edge becomes reachable
   * by scrolling the toolbar leftward (and `viewport.contains(...)` catches
   * the case correctly).
   */
  function scrollIntoView(element: HTMLElement) {
    const viewport = options.viewportEl.value
    if (!viewport || !isLg.value || maxScroll.value <= 0) {
      return
    }
    if (!viewport.contains(element)) {
      return
    }

    const viewportRect = viewport.getBoundingClientRect()
    const elRect = element.getBoundingClientRect()

    const leftOverflow = viewportRect.left + ARROW_OVERLAP_PX - elRect.left
    const rightOverflow = elRect.right - (viewportRect.right - ARROW_OVERLAP_PX)

    let next = scrollX.value
    if (leftOverflow > 0) {
      next -= leftOverflow
    } else if (rightOverflow > 0) {
      next += rightOverflow
    } else {
      return
    }

    scrollX.value = Math.max(0, Math.min(maxScroll.value, next))
  }

  onElementResize(options.viewportEl, (size) => {
    viewportWidth.value = size.width
    clamp()
  })

  onElementResize(options.contentEl, (size) => {
    contentWidth.value = size.width
    clamp()
  })

  let mql: MediaQueryList | null = null
  function onMediaChange(e: MediaQueryListEvent) {
    isLg.value = e.matches
    if (!e.matches) {
      scrollX.value = 0
      stopScroll()
    } else {
      clamp()
    }
  }

  if (typeof window !== 'undefined') {
    mql = window.matchMedia(LG_MEDIA_QUERY)
    mql.addEventListener('change', onMediaChange)
  }

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', onMediaChange)
    stopScroll()
  })

  return {
    scrollX,
    showLeft,
    showRight,
    startScroll,
    stopScroll,
    scrollIntoView,
  }
}
