import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'
export type MutationHostTransformArgs = {
  pluginId: string
}

export class MutationHostTransform extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('transform_host', configuration)
  }

  override execute(_context: MutationContext, args: MutationHostTransformArgs) {
    console.log(args)
    // @TODO
  }
}
