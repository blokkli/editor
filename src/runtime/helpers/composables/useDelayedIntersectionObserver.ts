export default function (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {},
) {
  let observer: IntersectionObserver | null = null
  let collected: HTMLElement[] = []

  function init() {
    observer = new IntersectionObserver(callback, {
      threshold: 0,
      ...options,
    })
    for (const el of collected) {
      observer.observe(el)
    }

    collected = []
  }

  function observe(el: HTMLElement) {
    if (observer) {
      observer.observe(el)
      return
    }
    collected.push(el)
  }

  function unobserve(el: HTMLElement) {
    if (observer) {
      observer.unobserve(el)
    }
  }

  return { observe, unobserve, init }
}
