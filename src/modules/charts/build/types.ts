export type ChartsModuleOptions = {
  /**
   * Provide the path to a custom component to render charts.
   *
   * @todo not yet implemented
   */
  chartRenderComponent?: string

  /**
   * Number format settings for the chart editor.
   */
  numberFormat?: {
    /**
     * Override the locales offered in the number-format editor.
     *
     * Provide an array of BCP-47 locale ids (e.g. `['de-CH', 'en-US']`) to
     * restrict the selectable locales. When omitted, blökkli ships a default
     * set. The label for each locale is derived automatically from its id.
     */
    locales?: string[]
  }
}
