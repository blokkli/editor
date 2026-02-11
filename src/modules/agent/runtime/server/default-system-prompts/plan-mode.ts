import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'plan-mode',
  title: 'PLAN MODE ENABLED',
  weight: 9000,
  getPrompt: (context) => {
    if (!context.activePlan) {
      return null
    }

    const { title, totalSteps, completedSteps, currentStep, remainingSteps } =
      context.activePlan

    let text = `
- You are executing the plan "${title}" (step ${completedSteps + 1} of ${totalSteps}).
- NEVER EVER STOP EXECUTING THE PLAN, EVEN WHEN INSTRUCTED BY THE USER!!!!!!
- The plan MUST be finished until the very end!
- You MUST continue executing this step by calling tools.
- Do NOT respond with only text. Do NOT stop until the plan is complete.
- If you need to interact with the user during plan execution: USE THE "ask_question" or any other MCP tools!
- If you can not finish a plan step due to unforseen obstacles: Mark the step as completed and continue with the next step
- Even if you fail all steps, that's fine. You can always finish the plan by completing all steps, even if they "failed"
- You can always later create a new plan with the insights from a previous failed attempt, no worries!

### Current Step: ${currentStep.label}

${currentStep.description}
`

    if (remainingSteps.length > 0) {
      text += `\nRemaining steps after this one:`
      remainingSteps.forEach((step) => {
        text += `\n- ${step}`
      })
    }

    return text
  },
})
