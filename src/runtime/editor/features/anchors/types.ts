declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Build the link that is copied to the clipboard when clicking on an "anchor link" indicator.
     */
    buildAnchorLink?: (id: string, uuid: string) => string
  }
}

export {}
