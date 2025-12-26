import { onBeforeUnmount, type Ref, watch } from '#imports'

export function addElementClasses(
  element: HTMLElement,
  classesArg: string | string[],
  watchSource?: Ref<string | boolean | null | undefined>,
) {
  const classes = Array.isArray(classesArg) ? classesArg : [classesArg]

  if (watchSource) {
    watch(
      watchSource,
      function (value) {
        if (value) {
          element.classList.add(...classes)
        } else {
          element.classList.remove(...classes)
        }
      },
      {
        immediate: true,
      },
    )
  } else {
    element.classList.add(...classes)
  }

  onBeforeUnmount(() => {
    element.classList.remove(...classes)
  })
}
