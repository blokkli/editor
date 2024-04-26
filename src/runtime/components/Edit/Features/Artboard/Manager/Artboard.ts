import type { Coord, Size, Rectangle } from '#blokkli/types'
import { easeOutQuad } from '#blokkli/helpers/easing'
import { lerp, calculateCenterPosition } from '#blokkli/helpers'

type TouchDirection = 'horizontal' | 'vertical' | 'both' | 'none'

/**
 * Implements a time-based queue.
 */
class Queue<T> {
  queue: T[] = []
  timeQueue: number[] = []

  reset() {
    this.queue.splice(0)
    this.timeQueue.splice(0)
  }

  pruneQueue(ms: number) {
    while (this.timeQueue.length && this.timeQueue[0] < Date.now() - ms) {
      this.timeQueue.shift()
      this.queue.shift()
    }
  }

  add(position: T) {
    this.queue.push(position)
    this.timeQueue.push(Date.now())
    this.pruneQueue(50)
  }
}

/**
 * Implements a queue to calculate the velocity of 2D coordinates.
 */
class VelocityQueue extends Queue<Coord> {
  max: number

  constructor(max: number) {
    super()
    this.max = max
  }

  getVelocity(): Coord {
    this.pruneQueue(1000)
    const length = this.timeQueue.length
    if (length < 2) return { x: 0, y: 0 }

    const distanceX = this.queue[length - 1].x - this.queue[0].x
    const distanceY = this.queue[length - 1].y - this.queue[0].y
    const time = (this.timeQueue[length - 1] - this.timeQueue[0]) / 1000

    const x = this.limit((distanceX / time) * 0.03)
    const y = this.limit((distanceY / time) * 0.03)
    return { x, y }
  }

  private limit(v: number) {
    return Math.min(Math.max(v, -this.max), this.max)
  }
}

class ScaleVelocityQueue extends Queue<number> {
  getVelocity(): number {
    this.pruneQueue(1000)
    const length = this.timeQueue.length
    if (length < 2) return 0

    const distance = this.queue[length - 1] - this.queue[0]
    const time = (this.timeQueue[length - 1] - this.timeQueue[0]) / 1000

    return (distance / time) * 0.03
  }
}

function applyRubberBandEffect(
  value: number,
  min: number,
  max: number,
  factor = 0.5,
) {
  if (value < min) {
    return min - (min - value) * factor
  } else if (value > max) {
    return max + (value - max) * factor
  }
  return value
}

type PossibleDragEventPosition = Array<Touch | MouseEvent> | TouchList

export type ArtboardOptions = {
  x?: number
  y?: number
  scale?: number
  padding?: number
  scrollSpeed?: number
  minScale?: number
  maxScale?: number
  maxVelocity?: number
  getBlockingRects?: () => Rectangle[]
}

type AnimationTarget = Coord & {
  scale: number
  alpha: number
  speed: number
}

export class Artboard {
  /**
   * The element containing the artboard that can be moved and zoomed.
   */
  artboardEl: HTMLElement

  /**
   * The parent/root element that defines the area in which the artboard can be interacted with.
   */
  rootEl: HTMLElement

  /**
   * The minimum scale amount.
   */
  minScale = 0.1

  /**
   * The maximum scale amount.
   */
  maxScale = 3

  /**
   * The maximum move velocity.
   */
  maxVelocity = 200

  /**
   * The current scale of the artboard.
   */
  scale = 1

  /**
   * The padding area inside the root element.
   */
  padding = 20

  /**
   * The multiplier for scrolling using the mouse wheel.
   */
  scrollSpeed = 1

  /**
   * The current arboard offset/translation.
   */
  offset: Coord

  /**
   * The native size of the artboard (without any scaling).
   */
  artboardSize: Size

  /**
   * The native size of the root element.
   */
  rootSize: Size

  /**
   * The target state for the current animation.
   */
  animationTarget: AnimationTarget | null = null

  /**
   * The last touch coordinate (or the midpoint of two touches when scaling).
   */
  lastTouch: Coord | null

  /**
   * Whether the user is currently dragging the artboard.
   */
  isDragging = false

  /**
   * Whether the user is currently scaling the artboard using touch gestures.
   */
  isScaling = false

  /**
   * The calculated velocity of a drag gesture.
   */
  velocity: Coord = { x: 0, y: 0 }

  /**
   * The queue containing the last touches to calculate the velocity.
   */
  velocityQueue: VelocityQueue

  /**
   * The calculated scale velocity.
   */
  scaleVelocity = 0

  /**
   * The queue containing the last scaling values during a scale gesture.
   */
  scaleVelocityQueue: ScaleVelocityQueue

  /**
   * Whether the animation loop is performing momentum scrolling.
   */
  isMomentumScrolling: boolean = false

  /**
   * The detected touch direction.
   */
  touchDirection: TouchDirection = 'none'

  /**
   * The coordinate at which the first touch event fired.
   */
  initialTouchPoint: Coord | null = null

  /**
   * The offset at the time the first touch event fired.
   */
  initialOffset: Coord = { x: 0, y: 0 }

  scaleMidpoint: Coord | null = null

  initialTouchDistance = 0
  initialScale = 1

  moveStartOffset: Coord | null = null
  moveStartCoords: Coord | null = null

  isPressingSpace = false

  /**
   * Whether the user is currently touching the artboard with at least one finger.
   */
  isTouching = false

  getBlockingRects: (() => Rectangle[]) | null = null

  listeners: Record<string, any> = {}

  resizeObserver: ResizeObserver

  scaleStartCoords: Coord | null = null
  lastScaleTimestamp = 0

  /**
   * The timestamp of the last call to animateTo().
   */
  lastAnimateToTimestamp = 0

  /**
   * Construct a new Artboard.
   */
  constructor(el: HTMLElement, rootEl: HTMLElement, options?: ArtboardOptions) {
    this.artboardEl = el
    this.rootEl = rootEl
    this.offset = {
      x: options?.x || 0,
      y: options?.y || 0,
    }
    this.lastTouch = null

    this.artboardSize = {
      width: el.offsetWidth,
      height: el.offsetHeight,
    }

    this.velocityQueue = new VelocityQueue(200)
    this.scaleVelocityQueue = new ScaleVelocityQueue()

    this.rootSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    if (options) {
      this.setOptions(options)
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === el) {
          const size = entry.contentBoxSize[0]
          if (!size) {
            return
          }

          this.artboardSize.width = size.inlineSize
          this.artboardSize.height = size.blockSize
        } else if (entry.target === rootEl) {
          const size = entry.contentBoxSize[0]
          if (!size) {
            return
          }

          this.rootSize.width = size.inlineSize
          this.rootSize.height = size.blockSize
        }
      }
    })

    this.resizeObserver.observe(this.artboardEl)
    this.resizeObserver.observe(this.rootEl)

    this.initListeners()
  }

  setOptions(options: ArtboardOptions) {
    if (options.scrollSpeed) {
      this.scrollSpeed = options.scrollSpeed
    }

    if (options.padding) {
      this.padding = options.padding
    }

    if (options.scale) {
      this.scale = options.scale
    }

    if (options.minScale) {
      this.minScale = options.minScale
    }

    if (options.maxScale) {
      this.maxScale = options.maxScale
    }

    if (options.getBlockingRects) {
      this.getBlockingRects = options.getBlockingRects
    }

    if (options.maxVelocity) {
      this.maxVelocity = options.maxVelocity
    }
  }

  initListeners() {
    this.listeners.onWheel = this.onWheel.bind(this)
    document.documentElement.addEventListener('wheel', this.listeners.onWheel, {
      passive: false,
    })

    this.listeners.onTouchStart = this.onTouchStart.bind(this)
    this.rootEl.addEventListener('touchstart', this.listeners.onTouchStart, {
      passive: false,
    })

    this.listeners.onTouchMove = this.onTouchMove.bind(this)
    this.rootEl.addEventListener('touchmove', this.listeners.onTouchMove, {
      passive: false,
    })

    this.listeners.onTouchEnd = this.onTouchEnd.bind(this)
    this.rootEl.addEventListener('touchend', this.listeners.onTouchEnd, {
      passive: false,
      capture: true,
    })

    this.listeners.onMouseDown = this.onMouseDown.bind(this)
    this.rootEl.addEventListener('mousedown', this.listeners.onMouseDown, {
      passive: false,
    })

    this.listeners.onMouseUp = this.onMouseUp.bind(this)
    this.rootEl.addEventListener('mouseup', this.listeners.onMouseUp, {
      passive: false,
    })

    this.listeners.onKeyDown = this.onKeyDown.bind(this)
    document.addEventListener('keydown', this.listeners.onKeyDown, {
      passive: false,
    })

    this.listeners.onKeyUp = this.onKeyUp.bind(this)
    document.addEventListener('keyup', this.listeners.onKeyUp, {
      passive: false,
    })
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !this.isPressingSpace) {
      this.isPressingSpace = true
    }
  }

  onKeyUp() {
    this.isPressingSpace = false
    this.moveStartOffset = null
    this.moveStartCoords = null
  }

  onMouseDown(e: MouseEvent) {
    if (this.isMomentumScrolling || this.isPressingSpace) {
      e.preventDefault()
      e.stopPropagation()
    }
    this.isMomentumScrolling = false
    if (
      (e.buttons === 1 && this.isPressingSpace) ||
      (e.buttons === 2 && !this.isPressingSpace)
    ) {
      e.preventDefault()
      this.onDragStart([e])
      this.listeners.onMouseMove = this.onMouseMove.bind(this)
      document.removeEventListener('mousemove', this.listeners.onMouseMove)
      document.addEventListener('mousemove', this.listeners.onMouseMove)
    }
  }

  onMouseUp() {
    document.removeEventListener('mousemove', this.listeners.onMouseMove)
    this.onDragEnd()
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isPressingSpace) {
      this.onDragEnd()
      document.removeEventListener('mousemove', this.listeners.onMouseMove)
      return
    }
    this.onDragMove([e])
  }

  getDistance(a: Coord, b: Coord) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  getTouchDistance(touches: PossibleDragEventPosition) {
    return this.getDistance(
      {
        x: touches[0].clientX,
        y: touches[0].clientY,
      },
      {
        x: touches[1].clientX,
        y: touches[1].clientY,
      },
    )
  }

  getMidpoint(touches: PossibleDragEventPosition): Coord {
    const x = touches[0].clientX
    const y = touches[0].clientY
    if (touches.length === 1) {
      return {
        x,
        y,
      }
    }
    return {
      x: (x + touches[1].clientX) / 2,
      y: (y + touches[1].clientY) / 2,
    }
  }

  onDragStart(touches: PossibleDragEventPosition) {
    this.animationTarget = null
    this.lastTouch = {
      x: touches[0].clientX,
      y: touches[0].clientY,
    }
    this.initialTouchPoint = { ...this.lastTouch }
    this.touchDirection = 'none' // Reset direction detection
    this.initialOffset = { ...this.offset }
    this.velocity = { x: 0, y: 0 }
    this.velocityQueue.reset()
    this.scaleVelocityQueue.reset()
    this.scaleVelocity = 0
  }

  onDragMove(touches: PossibleDragEventPosition) {
    if (!this.lastTouch || !this.initialTouchPoint) {
      this.onDragStart(touches)
      return
    }

    const midpoint = this.getMidpoint(touches)
    const focalPoint = {
      x: (midpoint.x - this.offset.x) / this.scale,
      y: (midpoint.y - this.offset.y) / this.scale,
    }
    this.velocityQueue.add(midpoint)

    // Handle scaling.
    if (touches.length === 2) {
      this.isDragging = false
      if (!this.scaleStartCoords) {
        this.scaleStartCoords = { ...this.lastTouch }
      }
      if (!this.isScaling) {
        this.isScaling = true
        this.lastTouch = { x: midpoint.x, y: midpoint.y }
      }
      this.velocityQueue.reset()
      const newTouchDistance = this.getTouchDistance(touches)
      const scaleFactor = newTouchDistance / this.initialTouchDistance

      const newScale = this.initialScale * scaleFactor
      this.scaleVelocityQueue.add(newScale)

      this.setScale(newScale)
      const diffX = midpoint.x - this.lastTouch.x
      const diffY = midpoint.y - this.lastTouch.y

      // Adjust offset based on new scale and focal point
      const newOffsetX = midpoint.x - focalPoint.x * this.scale
      const newOffsetY = midpoint.y - focalPoint.y * this.scale
      this.scaleMidpoint = {
        x: midpoint.x,
        y: midpoint.y,
      }

      this.setOffset(newOffsetX + diffX, newOffsetY + diffY)
      this.lastTouch = { x: midpoint.x, y: midpoint.y }
      this.lastScaleTimestamp = Date.now()
      return
    }

    if (this.isScaling) {
      if (Date.now() - this.lastScaleTimestamp < 200) {
        return
      }
      this.isScaling = false
      this.touchDirection = 'none'
      this.isMomentumScrolling = false
      this.initialTouchPoint = { ...midpoint }
      this.initialOffset = { ...this.offset }
      this.lastTouch = { ...midpoint }
      return
    }

    this.scaleStartCoords = null
    this.isScaling = false
    this.isDragging = true

    const diffX = midpoint.x - this.initialTouchPoint.x
    const diffY = midpoint.y - this.initialTouchPoint.y

    if (this.touchDirection === 'none') {
      const deltaX = Math.abs(midpoint.x - this.initialTouchPoint.x)
      const deltaY = Math.abs(midpoint.y - this.initialTouchPoint.y)

      // Adjust the threshold for detecting diagonal gestures
      const thresholdRatio = 0.9
      const ratio = deltaY > 0 ? deltaX / deltaY : deltaX

      if (ratio > 1 + thresholdRatio) {
        this.touchDirection = 'horizontal'
      } else if (ratio < 1 - thresholdRatio) {
        this.touchDirection = 'vertical'
      } else {
        this.touchDirection = 'both'
      }
    }

    // Apply movement based on detected direction
    let moveX = 0
    let moveY = 0
    switch (this.touchDirection) {
      case 'horizontal':
        moveX = diffX
        break
      case 'vertical':
        moveY = diffY
        break
      case 'both':
        moveX = diffX
        moveY = diffY
        break
    }

    this.setOffset(this.initialOffset.x + moveX, this.initialOffset.y + moveY)
    this.lastTouch = { x: midpoint.x, y: midpoint.y }
  }

  resetDraggingState() {
    this.isDragging = false
    this.isScaling = false
  }

  onDragEnd() {
    this.resetDraggingState()
    if (!this.initialTouchPoint || !this.lastTouch) {
      return
    }

    const velocity = this.velocityQueue.getVelocity()
    const totalVelocity = Math.abs(velocity.x) + Math.abs(velocity.y)

    if (totalVelocity < 40) {
      this.velocity = { x: 0, y: 0 }
      this.isMomentumScrolling = false
    } else {
      if (
        this.touchDirection === 'horizontal' ||
        this.touchDirection === 'both'
      ) {
        this.velocity.x = velocity.x
      }
      if (
        this.touchDirection === 'vertical' ||
        this.touchDirection === 'both'
      ) {
        this.velocity.y = velocity.y
      }
      this.isMomentumScrolling = true
    }

    const scaleVelocity = this.scaleVelocityQueue.getVelocity() / 7
    if (scaleVelocity > 0.01) {
      this.scaleVelocity = scaleVelocity
      this.isMomentumScrolling = false
    }

    // Reset for the next gesture
    this.initialTouchPoint = null
  }

  onTouchStart(e: TouchEvent) {
    this.isTouching = true
    if (e.touches.length === 1) {
      this.onDragStart(e.touches)
    }
    if (e.touches.length === 2) {
      this.initialTouchDistance = this.getTouchDistance(e.touches)
      this.initialScale = this.scale
    }
  }

  onTouchMove(e: TouchEvent) {
    e.preventDefault()
    e.stopPropagation()
    this.onDragMove(e.touches)
  }

  onTouchEnd(e: TouchEvent) {
    if (this.isDragging || this.isMomentumScrolling) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    if (e.touches.length === 0) {
      this.isTouching = false
      this.onDragEnd()
    }
  }

  destroy() {
    this.artboardEl.style.transform = ''
    this.resizeObserver.disconnect()
    this.rootEl.removeEventListener('touchstart', this.listeners.onTouchStart)
    this.rootEl.removeEventListener('touchmove', this.listeners.onTouchMove)
    this.rootEl.removeEventListener('touchend', this.listeners.onTouchEnd, {
      capture: true,
    })
    this.rootEl.removeEventListener('mousedown', this.listeners.onMouseDown)
    this.rootEl.removeEventListener('mouseup', this.listeners.onMouseUp)
    document.documentElement.removeEventListener(
      'wheel',
      this.listeners.onWheel,
    )
    document.removeEventListener('keydown', this.listeners.onKeyDown)
    document.removeEventListener('keyup', this.listeners.onKeyUp)
    document.removeEventListener('mousemove', this.listeners.onMouseMove)
  }

  loop() {
    if (this.isMomentumScrolling && !this.isDragging) {
      const deceleration = 0.95
      let stopMomentumX = false
      let stopMomentumY = false

      const boundaries = this.getBoundaries()
      const isOutsideY =
        boundaries.yMax - this.offset.y < -1 ||
        boundaries.yMin - this.offset.y > 1

      const isOutsideX =
        boundaries.xMax - this.offset.x < -1 ||
        boundaries.xMin - this.offset.x > 1

      if (
        this.touchDirection === 'horizontal' ||
        this.touchDirection === 'both'
      ) {
        this.velocity.x *= deceleration
        if (Math.abs(this.velocity.x) < 0.01) {
          stopMomentumX = true
        }
      }

      if (
        this.touchDirection === 'vertical' ||
        this.touchDirection === 'both'
      ) {
        this.velocity.y *= deceleration
        if (Math.abs(this.velocity.y) < 0.01) {
          stopMomentumY = true
        }
      }

      // Update the offset based on the remaining velocity
      this.setOffset(
        this.offset.x + this.velocity.x,
        this.offset.y + this.velocity.y,
      )

      // Stop momentum scrolling if necessary
      if (
        (stopMomentumX ||
          (this.touchDirection !== 'horizontal' &&
            this.touchDirection !== 'both')) &&
        (stopMomentumY ||
          (this.touchDirection !== 'vertical' &&
            this.touchDirection !== 'both'))
      ) {
        if (!isOutsideY && !isOutsideX) {
          this.isMomentumScrolling = false
          this.velocity = { x: 0, y: 0 }
          this.touchDirection = 'none' // Reset direction for the next gesture
        }
      }
    } else if (this.animationTarget) {
      const easedAlpha = easeOutQuad(this.animationTarget.alpha)
      // Update the offset values
      const x = lerp(this.offset.x, this.animationTarget.x, easedAlpha)
      const y = lerp(this.offset.y, this.animationTarget.y, easedAlpha)
      this.setOffset(x, y)
      const newScale = lerp(this.scale, this.animationTarget.scale, easedAlpha)
      this.scale = newScale

      // Increase alpha towards 1 at each frame
      if (this.animationTarget.alpha < 1) {
        this.animationTarget.alpha += this.animationTarget.speed
      }

      if (
        Math.abs(this.offset.x - this.animationTarget.x) < 1 &&
        Math.abs(this.offset.y - this.animationTarget.y) < 1 &&
        Math.abs(this.scale - this.animationTarget.scale) < 0.02
      ) {
        this.offset.x = this.animationTarget.x
        this.offset.y = this.animationTarget.y
        this.scale = this.animationTarget.scale
        this.animationTarget = null
      }
    } else if (this.scaleVelocity && this.scaleMidpoint) {
      // const deceleration = 0.95
      // const focalPoint = {
      //   x: (this.scaleMidpoint.x - this.offset.x) / this.scale,
      //   y: (this.scaleMidpoint.y - this.offset.y) / this.scale,
      // }
      // this.scale = Math.min(
      //   Math.max(this.scale + this.scaleVelocity, this.minScale),
      //   this.maxScale,
      // )
      // this.scaleVelocity *= deceleration
      // const newOffsetX = this.scaleMidpoint.x - focalPoint.x * this.scale
      // const newOffsetY = this.scaleMidpoint.y - focalPoint.y * this.scale
      // this.setOffset(newOffsetX, newOffsetY)
    }

    if (!this.isScaling && this.scaleMidpoint) {
      const x = this.scaleMidpoint.x
      const y = this.scaleMidpoint.y
      const targetX = (x - this.offset.x) / this.scale
      const targetY = (y - this.offset.y) / this.scale

      if (
        Math.abs(this.scale - this.maxScale) > 0.01 &&
        Math.abs(this.scale - this.minScale) > 0.01
      ) {
        const newScale = applyRubberBandEffect(
          this.scale,
          this.minScale,
          this.maxScale,
          0.7,
        )
        this.scale = newScale
        this.setOffset(-targetX * this.scale + x, -targetY * this.scale + y)
      } else {
        this.isScaling = false
        if (this.scale > this.maxScale) {
          this.scale = this.maxScale
        } else if (this.scale < this.minScale) {
          this.scale = this.minScale
        }
        this.setOffset(-targetX * this.scale + x, -targetY * this.scale + y)
      }
    }

    this.updateStyles()
  }

  getCenterX(targetScale?: number): number {
    const scaleToUse = targetScale || this.scale
    const blockingRects = this.getBlockingRects ? this.getBlockingRects() : []
    return calculateCenterPosition(
      blockingRects,
      { ...this.rootSize, x: 0, y: 0 },
      this.artboardEl.offsetWidth * scaleToUse,
    )
  }

  animateTo(x: number, y: number, targetScale?: number) {
    this.isMomentumScrolling = false
    this.lastTouch = null
    this.initialTouchPoint = null
    this.isScaling = false
    this.animationTarget = {
      x,
      y,
      scale: targetScale || this.scale,
      alpha: 0,
      speed: 0.01,
    }
  }

  getEndY() {
    const v = this.artboardSize.height * this.scale
    return -v + this.rootSize.height - this.padding
  }

  animateOrJumpBy(y: number) {
    const diff = Date.now() - this.lastAnimateToTimestamp
    if (diff < 300) {
      this.setOffset(
        this.offset.x,
        (this.animationTarget?.y || this.offset.y) + y,
      )
      this.animationTarget = null
    } else {
      this.animateTo(this.offset.x, this.offset.y + y)
    }
    this.lastAnimateToTimestamp = Date.now()
  }

  animateOrJumpTo(y: number) {
    const diff = Date.now() - this.lastAnimateToTimestamp
    if (diff < 300) {
      this.setOffset(
        this.offset.x,
        (this.animationTarget?.y || this.offset.y) + y,
      )
      this.animationTarget = null
    } else {
      this.animateTo(this.offset.x, y)
    }
    this.lastAnimateToTimestamp = Date.now()
  }

  scrollPageUp() {
    this.animateOrJumpBy(this.rootSize.height)
  }

  scrollPageDown() {
    this.animateOrJumpBy(-this.rootSize.height)
  }

  scrollPageLeft() {
    this.animateOrJumpTo(
      Math.min(this.offset.y + this.rootSize.height, this.padding),
    )
  }

  scrollPageRight() {
    this.animateOrJumpTo(
      Math.max(this.offset.y - this.rootSize.height, this.getEndY()),
    )
  }

  scrollToTop() {
    this.animateOrJumpTo(this.padding * 2)
  }

  scrollToEnd() {
    this.animateOrJumpTo(this.getEndY())
  }

  scaleToFit() {
    const targetScale =
      (this.rootSize.height - this.padding) / this.artboardSize.height
    this.animateTo(this.getCenterX(targetScale), this.padding / 2, targetScale)
  }

  resetZoom() {
    // Calculate the center of the viewport in the current scale.
    const viewportCenterY = this.rootSize.height / 2
    const currentCenterOnArtboard =
      (-this.offset.y + viewportCenterY) / this.scale

    // If the height of the artboard is smaller than the visible viewport height
    // always set the position in such a way that it is perfectly centered in the
    // viewport.
    if (this.artboardSize.height < this.rootSize.height) {
      const newYOffset = this.rootSize.height / 2 - this.artboardSize.height / 2
      return this.animateTo(this.getCenterX(1), newYOffset, 1)
    }

    // Calculate the new offset so that whatever is in the center of the
    // viewport remains the center after applying the scale.
    const newYOffset = Math.min(
      Math.max(
        -currentCenterOnArtboard + viewportCenterY,
        -this.artboardSize.height + this.rootSize.height - this.padding,
      ),
      this.padding * 2,
    )
    this.animateTo(this.getCenterX(1), newYOffset, 1)
  }

  updateStyles() {
    this.artboardEl.style.transform = `translate3d(${Math.round(this.offset.x * 10) / 10}px, ${Math.round(this.offset.y * 10) / 10}px, 0px) scale(${this.scale.toString()}) `
  }

  getBoundaries(providedScale?: number) {
    const targetScale = providedScale || this.scale
    const artboardWidth = this.artboardSize.width * targetScale
    const artboardHeight = this.artboardSize.height * targetScale
    // const xMin = -(artboardWidth - this.padding) + this.rootSize.width / 2
    const xMin = -artboardWidth + 100 + 70
    const xMax = this.rootSize.width - 50 - 100
    const yMin = -artboardHeight
    const yMax = this.rootSize.height - 50

    return { xMin, xMax, yMin, yMax }
  }

  setScale(newScale: number) {
    this.scale = applyRubberBandEffect(
      newScale,
      this.minScale,
      this.maxScale,
      0.2,
    )
  }

  setOffset(x: number, y: number) {
    // Determine if we are currently dragging or in momentum scrolling
    const { xMin, xMax, yMin, yMax } = this.getBoundaries()
    const adjustedX = applyRubberBandEffect(x, xMin, xMax)
    const adjustedY = applyRubberBandEffect(y, yMin, yMax)

    // Update the offset with the rubber band effect applied
    this.offset.x = adjustedX
    this.offset.y = adjustedY
    // this.offset.x = 0
    // this.offset.y = 0
  }

  stopAnimate() {
    this.animationTarget = null
    this.isMomentumScrolling = false
    this.velocity = { x: 0, y: 0 }
  }

  scaleAroundPoint(x: number, y: number, newScale: number) {
    const targetX = (x - this.offset.x) / this.scale
    const targetY = (y - this.offset.y) / this.scale

    this.setScale(newScale)
    this.setOffset(-targetX * this.scale + x, -targetY * this.scale + y)
  }

  doZoom(x: number, y: number, delta: number) {
    const SCALE_BASE = 1.1
    const scaleFactor = Math.pow(SCALE_BASE, -Math.sign(delta) / 1.25)
    const newScale = this.scale * scaleFactor
    this.scaleAroundPoint(x, y, newScale)
  }

  onWheel(e: WheelEvent) {
    this.stopAnimate()
    e.preventDefault()
    e.stopPropagation()

    if (e.ctrlKey) {
      this.doZoom(e.pageX, e.pageY, e.deltaY)
    } else {
      this.setOffset(
        this.offset.x + -(e.deltaX * this.scrollSpeed),
        this.offset.y + -(e.deltaY * this.scrollSpeed),
      )
    }
  }
}
