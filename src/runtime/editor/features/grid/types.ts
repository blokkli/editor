declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Return the HTML markup for displaying the grid.
     */
    getGridMarkup?: () => Promise<string> | string
  }
}
