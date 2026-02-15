export type ChartColor = {
  /**
   * A valid CSS color value, e.g. '#ff0000', 'rgb(255, 0, 0)',
   * or 'rgb(var(--theme-color-primary))' for CSS custom properties.
   */
  color: string

  /**
   * The label of the color.
   */
  label: string
}

export type ChartsModuleOptions = {
  colors: Record<string, ChartColor>
}
