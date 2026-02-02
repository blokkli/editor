import { BlockProxy, type MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '#mock/entityStorage'
import { getBlockBundles } from '#mock/state/Block'
import type { RewriteTool } from '../../../../../../src/runtime/editor/features/rewrite/types'

export type MutationApplyRewriteArgs = {
  /** Field values by uuid -> fieldName -> value */
  values: Record<string, Record<string, string>>
  /** Tool calls to execute */
  toolCalls?: RewriteTool[]
}

/**
 * Mutation that applies rewritten field values and tool calls in a single batch operation.
 */
export class MutationApplyRewrite extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('apply_rewrite', configuration)
  }

  override getAffectedUuid(args: MutationApplyRewriteArgs): string | undefined {
    // Return the first UUID as the affected one for display purposes
    const uuids = Object.keys(args.values)
    if (uuids[0]) return uuids[0]

    // Or first tool call's affected UUID
    if (args.toolCalls?.length) {
      const firstTool = args.toolCalls[0]!
      if (firstTool.name === 'add_block') {
        return firstTool.params.hostUuid
      }
      if (
        firstTool.name === 'rewrite_text' ||
        firstTool.name === 'delete_block' ||
        firstTool.name === 'move_block'
      ) {
        return firstTool.params.uuid
      }
    }
    return undefined
  }

  override execute(context: MutationContext, args: MutationApplyRewriteArgs) {
    // Apply field value updates
    for (const [uuid, fields] of Object.entries(args.values)) {
      const proxy = context.getProxy(uuid)
      if (!proxy) {
        continue
      }

      const block = proxy.block

      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        const field = block.get(fieldName)
        if (!field) {
          continue
        }
        field.setList([JSON.parse(JSON.stringify(fieldValue))])
      }
    }

    // Execute tool calls
    if (args.toolCalls) {
      for (const toolCall of args.toolCalls) {
        this.executeToolCall(context, toolCall)
      }
    }
  }

  private executeToolCall(context: MutationContext, tool: RewriteTool) {
    switch (tool.name) {
      case 'rewrite_text':
        this.executeRewriteText(context, tool.params)
        break
      case 'add_block':
        this.executeAddBlock(context, tool.params)
        break
      case 'delete_block':
        this.executeDeleteBlock(context, tool.params)
        break
      case 'move_block':
        this.executeMoveBlock(context, tool.params)
        break
    }
  }

  private executeRewriteText(
    context: MutationContext,
    params: { uuid: string; fieldName: string; value: string },
  ) {
    const proxy = context.getProxy(params.uuid)
    if (!proxy) return

    const field = proxy.block.get(params.fieldName)
    if (!field) return

    field.setList([JSON.parse(JSON.stringify(params.value))])
  }

  private executeAddBlock(
    context: MutationContext,
    params: {
      tempId: string
      bundle: string
      hostUuid: string
      hostFieldName: string
      afterUuid: string | null
      fields: Record<string, string>
    },
  ) {
    const uuid = this.getUuidForNewEntity(params.tempId)
    const block = entityStorageManager.createBlock(params.bundle, uuid)

    const blockBundle = getBlockBundles().find(
      (v) => v.bundle === params.bundle,
    )
    const defaultValues = blockBundle?.getDefaultValues() || {}

    // Merge default values with AI-generated fields
    block.setValues({ ...defaultValues, ...params.fields })

    const proxy = new BlockProxy(
      block,
      'block', // Host entity type
      params.hostUuid,
      params.hostFieldName,
    )

    context.addProxy(proxy, params.afterUuid)
  }

  private executeDeleteBlock(
    context: MutationContext,
    params: { uuid: string },
  ) {
    const proxy = context.getProxy(params.uuid)
    if (proxy) {
      proxy.markAsDeleted()
    }
  }

  private executeMoveBlock(
    context: MutationContext,
    params: {
      uuid: string
      hostUuid: string
      hostFieldName: string
      afterUuid: string | null
    },
  ) {
    const proxy = context.getProxy(params.uuid)
    if (!proxy) return

    // Update host info
    proxy.hostEntityUuid = params.hostUuid
    proxy.hostField = params.hostFieldName

    // Move position
    context.moveProxyAfter(params.uuid, params.afterUuid)
  }
}
