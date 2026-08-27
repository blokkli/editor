import type { AgentApp, AgentPromptDefinition } from '#blokkli/agent/app/types'
import type { SelectedBlock } from '#blokkli/agent/shared/types'
import type { BlokkliApp } from '#blokkli/editor/types/app'

/**
 * Run a pre-defined prompt: execute its optional `preExecute` hook and send
 * the resulting prompt to the agent.
 *
 * Shared by every entry point that can start a pre-defined prompt (the block
 * dropdown action queued by `features/agent/index.vue`, the welcome screen),
 * so pre-seeded tool results, auto-executed tools and the `promptId` needed
 * for replay are always passed along the same way.
 */
export async function runAgentPrompt(options: {
  app: BlokkliApp
  agent: AgentApp
  prompt: AgentPromptDefinition
  selectedBlocks: SelectedBlock[]
}): Promise<void> {
  const { app, agent, prompt, selectedBlocks } = options

  const promptText = prompt.getPrompt(app)
  const userPromptText = prompt.getUserPrompt?.(app)

  let preSeededResults = undefined
  let autoExecuteTools = undefined

  if (prompt.preExecute) {
    const preResult = await prompt.preExecute({
      app,
      selectedBlocks,
      runTool: agent.tools.runForPrompt,
    })
    if (preResult) {
      preSeededResults = preResult.preSeededResults
      autoExecuteTools = preResult.autoExecuteTools
    }
  }

  agent.sendPrompt({
    prompt: promptText,
    displayPrompt: userPromptText,
    selectedBlocks,
    autoLoadTools: prompt.tools,
    autoLoadSkills: prompt.skills,
    preSeededResults,
    autoExecuteTools,
    promptId: prompt.id,
  })
}
