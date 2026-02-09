import type { PageContext, EditMode } from '../../shared/types'
import type { ResolvedSkill } from '../skills/types'

export type ActivePlanContext = {
  title: string
  totalSteps: number
  completedSteps: number
  currentStep: { label: string; description: string }
  remainingSteps: string[]
}

export type SystemPromptContext = {
  pageContext: PageContext
  resolvedSkills: ResolvedSkill[]
  lazyTools: { name: string; description: string }[]
  isDebugMode: boolean
  activePlan?: ActivePlanContext
  loadedSkills: ReadonlySet<string>
}

export type SystemPromptDefinition = {
  id: string
  title: string
  weight: number
  modes?: EditMode[]
  getPrompt: (context: Readonly<SystemPromptContext>) => string | null
}
