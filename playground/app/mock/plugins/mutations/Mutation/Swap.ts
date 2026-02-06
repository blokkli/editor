import { Mutation } from '../Mutation'
import type { MutationContext } from '#mock/state/EditState'

export type MutationSwapArgs = {
  firstUuid: string
  secondUuid: string
}

export class MutationSwap extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('swap', configuration)
  }

  override getAffectedUuid(args: MutationSwapArgs): string | undefined {
    return args.firstUuid
  }

  override execute(context: MutationContext, args: MutationSwapArgs) {
    const firstProxy = context.getProxy(args.firstUuid)
    const secondProxy = context.getProxy(args.secondUuid)

    if (!firstProxy || !secondProxy) {
      throw new Error('One or both blocks not found')
    }

    // Check if blocks are in the same field
    const sameField =
      firstProxy.hostEntityUuid === secondProxy.hostEntityUuid &&
      firstProxy.hostField === secondProxy.hostField

    if (sameField) {
      // Same field swap - use the original optimized logic
      this.swapInSameField(context, args, firstProxy, secondProxy)
    } else {
      // Cross-field swap - move each block to the other's position
      this.swapAcrossFields(context, firstProxy, secondProxy)
    }
  }

  private swapInSameField(
    context: MutationContext,
    args: MutationSwapArgs,
    firstProxy: ReturnType<MutationContext['getProxy']> & object,
    _secondProxy: ReturnType<MutationContext['getProxy']> & object,
  ) {
    // Get the indices
    const firstIndex = context.getIndex(args.firstUuid)
    const secondIndex = context.getIndex(args.secondUuid)

    if (firstIndex === undefined || secondIndex === undefined) {
      throw new Error('Could not determine block positions')
    }

    // Store original host info (they're the same for both)
    const hostEntityType = firstProxy.hostEntityType
    const hostEntityUuid = firstProxy.hostEntityUuid
    const hostField = firstProxy.hostField

    // Get proxies for the same host to find neighbors
    const hostProxies = context.getProxiesForHost(
      hostEntityType,
      hostEntityUuid,
    )
    const fieldProxies = hostProxies
      .filter((p) => p.hostField === hostField)
      .sort(
        (a, b) =>
          (context.getIndex(a.block.uuid) ?? 0) -
          (context.getIndex(b.block.uuid) ?? 0),
      )

    // Find positions in field
    const firstFieldIdx = fieldProxies.findIndex(
      (p) => p.block.uuid === args.firstUuid,
    )
    const secondFieldIdx = fieldProxies.findIndex(
      (p) => p.block.uuid === args.secondUuid,
    )

    if (firstFieldIdx === -1 || secondFieldIdx === -1) {
      throw new Error('Could not find blocks in field')
    }

    // Determine which is earlier
    const [earlierIdx, laterIdx] =
      firstFieldIdx < secondFieldIdx
        ? [firstFieldIdx, secondFieldIdx]
        : [secondFieldIdx, firstFieldIdx]
    const [earlierUuid, laterUuid] =
      firstFieldIdx < secondFieldIdx
        ? [args.firstUuid, args.secondUuid]
        : [args.secondUuid, args.firstUuid]

    // Get the UUID before the earlier position (or null if at start)
    const beforeEarlier =
      earlierIdx > 0 ? fieldProxies[earlierIdx - 1]?.block.uuid : null

    // Move later block to earlier position
    context.moveProxyAfter(laterUuid, beforeEarlier ?? undefined)

    // The earlier block is now shifted. Move it to where the later one was.
    // The block that was originally at laterIdx-1 is now our reference
    const afterLater = fieldProxies[laterIdx - 1]?.block.uuid
    context.moveProxyAfter(earlierUuid, afterLater ?? undefined)
  }

  private swapAcrossFields(
    context: MutationContext,
    firstProxy: ReturnType<MutationContext['getProxy']> & object,
    secondProxy: ReturnType<MutationContext['getProxy']> & object,
  ) {
    // Store the original positions of both blocks
    const firstHostType = firstProxy.hostEntityType
    const firstHostUuid = firstProxy.hostEntityUuid
    const firstHostField = firstProxy.hostField
    const firstUuid = firstProxy.block.uuid

    const secondHostType = secondProxy.hostEntityType
    const secondHostUuid = secondProxy.hostEntityUuid
    const secondHostField = secondProxy.hostField
    const secondUuid = secondProxy.block.uuid

    // Get the block that comes before each proxy in their respective fields
    const firstFieldProxies = context
      .getProxiesForHost(firstHostType, firstHostUuid)
      .filter((p) => p.hostField === firstHostField)
      .sort(
        (a, b) =>
          (context.getIndex(a.block.uuid) ?? 0) -
          (context.getIndex(b.block.uuid) ?? 0),
      )

    const secondFieldProxies = context
      .getProxiesForHost(secondHostType, secondHostUuid)
      .filter((p) => p.hostField === secondHostField)
      .sort(
        (a, b) =>
          (context.getIndex(a.block.uuid) ?? 0) -
          (context.getIndex(b.block.uuid) ?? 0),
      )

    const firstFieldIdx = firstFieldProxies.findIndex(
      (p) => p.block.uuid === firstUuid,
    )
    const secondFieldIdx = secondFieldProxies.findIndex(
      (p) => p.block.uuid === secondUuid,
    )

    // Get the UUID before each block (or undefined if at start)
    const beforeFirst =
      firstFieldIdx > 0
        ? firstFieldProxies[firstFieldIdx - 1]?.block.uuid
        : undefined
    const beforeSecond =
      secondFieldIdx > 0
        ? secondFieldProxies[secondFieldIdx - 1]?.block.uuid
        : undefined

    // Move first block to second's field (at second's position)
    context.moveProxyToField(
      firstUuid,
      secondHostType,
      secondHostUuid,
      secondHostField,
      beforeSecond,
    )

    // Move second block to first's field (at first's position)
    context.moveProxyToField(
      secondUuid,
      firstHostType,
      firstHostUuid,
      firstHostField,
      beforeFirst,
    )
  }
}
