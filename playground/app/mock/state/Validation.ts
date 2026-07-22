export type EntityValidation = {
  propertyPath: string
  message: string
}

/**
 * The children a block has in the *mutated* state, keyed by block-field name.
 *
 * Parentage during a mutation lives in the proxy graph, not on the entities
 * themselves: `BlockProxy` clones a block's persisted values and records its
 * host separately, so a block's own block-field lists still describe the state
 * on disk. A block created by the current mutation therefore looks empty no
 * matter what children were added alongside it.
 *
 * `getMutatedState` resolves this map from the proxy graph and hands it to
 * `validate()` so structural rules see the tree as it will be saved.
 */
export type MutatedChildren = Record<string, string[]>
