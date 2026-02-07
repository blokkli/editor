declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Swap two blocks.
     */
    swapBlocks?: (
      first: string,
      second: string,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Get an authentication token for the agent WebSocket connection.
     *
     * The token is included in the WebSocket init message and validated
     * server-side using HMAC. The adapter should obtain the token from
     * an authenticated CMS endpoint.
     */
    getAgentAuthToken?: () => Promise<string | null>
  }
}
