declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Build the link that is copied to the clipboard when clicking on an "anchor link" indicator.
     */
    buildAnchorLink?: (id: string, uuid: string) => string
  }
}
