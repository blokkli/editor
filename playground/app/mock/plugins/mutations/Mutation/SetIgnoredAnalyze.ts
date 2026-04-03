import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationIgnoreAnalyzeArgs = {
  identifiers: string[]
}

export class MutationIgnoreAnalyze extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('ignore_analyze', configuration)
  }

  override execute(context: MutationContext, args: MutationIgnoreAnalyzeArgs) {
    for (const id of args.identifiers) {
      if (!context.ignoredAnalyzeIdentifiers.includes(id)) {
        context.ignoredAnalyzeIdentifiers.push(id)
      }
    }
  }
}

export type MutationUnignoreAnalyzeArgs = {
  identifiers: string[]
}

export class MutationUnignoreAnalyze extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('unignore_analyze', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationUnignoreAnalyzeArgs,
  ) {
    const toRemove = new Set(args.identifiers)
    context.ignoredAnalyzeIdentifiers =
      context.ignoredAnalyzeIdentifiers.filter((id) => !toRemove.has(id))
  }
}
