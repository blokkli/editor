import { onBeforeUnmount, onMounted } from '#imports'

export default function (cb: (time: number) => void) {
  let raf: any = null

  const loop = (time: number) => {
    cb(time)
    raf = window.requestAnimationFrame(loop)
  }

  onMounted(() => {
    raf = window.requestAnimationFrame(loop)
  })

  onBeforeUnmount(() => {
    window.cancelAnimationFrame(raf)
  })
}
