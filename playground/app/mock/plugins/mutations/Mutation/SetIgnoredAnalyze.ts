import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationIgnoreAnalyzeArgs = {
  identifier: string
}

export class MutationIgnoreAnalyze extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('ignore_analyze', configuration)
  }

  override execute(context: MutationContext, args: MutationIgnoreAnalyzeArgs) {
    if (!context.ignoredAnalyzeIdentifiers.includes(args.identifier)) {
      context.ignoredAnalyzeIdentifiers.push(args.identifier)
    }
  }
}

export type MutationUnignoreAnalyzeArgs = {
  identifier: string
}

export class MutationUnignoreAnalyze extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('unignore_analyze', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationUnignoreAnalyzeArgs,
  ) {
    context.ignoredAnalyzeIdentifiers =
      context.ignoredAnalyzeIdentifiers.filter((id) => id !== args.identifier)
  }
}
