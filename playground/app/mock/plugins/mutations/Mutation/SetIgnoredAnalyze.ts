import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationSetIgnoredAnalyzeArgs = {
  identifiers: string[]
}

export class MutationSetIgnoredAnalyze extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('set_ignored_analyze', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationSetIgnoredAnalyzeArgs,
  ) {
    context.ignoredAnalyzeIdentifiers = args.identifiers
  }
}
