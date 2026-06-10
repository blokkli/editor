export type ColorShade = {
  id: string
  hex: string
  isMain: boolean
}

export type ColorOption = {
  id: string
  hex: string
  label: string
  shades?: ColorShade[]
}
