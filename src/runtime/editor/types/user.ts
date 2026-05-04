/**
 * The user currently editing. Returned by the adapter's `getCurrentUser`
 * method and exposed through the `user` provider.
 */
export type BlokkliUser = {
  id: string
  name: string
  imageUrl?: string | null
}
