type ArtboardOptions = {
  x?: number
  y?: number
  scale?: number
}

export default class Artboard {
  el: HTMLElement
  scale: number
  x: number
  y: number
  height: number
  width: number

  constructor(el: HTMLElement, options?: ArtboardOptions) {
    this.el = el
    this.scale = options?.scale || 0
    this.x = options?.x || 0
    this.y = options?.y || 0

    this.height = el.offsetHeight
    this.width = el.offsetWidth
  }

  updateStyles() {
    this.el.style.scale = this.scale.toString()
    this.el.style.translate = `${Math.round(this.x)}px ${Math.round(this.y)}px`
  }
}
