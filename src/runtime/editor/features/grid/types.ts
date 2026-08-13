declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Return the HTML markup for displaying the grid.
     */
    getGridMarkup?: () => Promise<string> | string
  }
}

export {}
