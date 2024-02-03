import { onBeforeUnmount, onMounted } from '#imports'

export default function (cb: () => void) {
  let raf: any = null

  const loop = () => {
    cb()
    raf = window.requestAnimationFrame(loop)
  }

  onMounted(() => {
    loop()
  })

  onBeforeUnmount(() => {
    window.cancelAnimationFrame(raf)
  })
}
