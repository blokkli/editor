declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get the shareable preview URL.
     *
     * This should return a URL that can be used to bypass logins, using a token or similar, that can be shared with non-editing people.
     */
    getPreviewGrantUrl?: () =>
      | Promise<string | undefined | null>
      | string
      | undefined
      | null
  }
}

export {}
