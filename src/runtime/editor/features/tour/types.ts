export type TourItem = {
  id: string
  title: string
  text: string
  element:
    | HTMLElement
    | (() => HTMLElement | undefined | null)
    | undefined
    | null
}
