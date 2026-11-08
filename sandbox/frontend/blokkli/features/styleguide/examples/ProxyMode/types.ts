/**
 * A block of the mocked field, with what the site renders for it.
 */
export type DemoSlide = {
  uuid: string
  bundle: 'title' | 'teaser' | 'image'
  title: string
  text?: string

  /**
   * Which of the mocked pictures an image shows.
   */
  tone?: number
}
