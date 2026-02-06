import type { PageContext, EditMode } from '../../shared/types'
import type { ResolvedSkill } from '../skills/types'

export type SystemPromptContext = {
  pageContext: PageContext
  resolvedSkills: ResolvedSkill[]
  lazyTools: { name: string; description: string }[]
  isDebugMode: boolean
}

export type SystemPromptDefinition = {
  id: string
  title: string
  weight: number
  modes?: EditMode[]
  getPrompt: (context: SystemPromptContext) => string | null
}
