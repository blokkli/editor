import { defineCodeTemplate } from '../../../../../src/build/templates/defineTemplate'
import type { SkillCollector } from '../SkillCollector'

export type AgentSkillsOptions = {
  /** The skill collector instance (called dynamically for fresh skills) */
  collector: SkillCollector
  /** Absolute path to the skills types file */
  typesPath: string
}

/**
 * Creates a server-only template that imports and exports agent skills.
 * Skills are TypeScript modules using defineBlokkliAgentSkill().
 */
export function createAgentSkillsTemplate(options: AgentSkillsOptions) {
  const { collector, typesPath } = options

  return defineCodeTemplate(
    'agent-skills',
    () => {
      const skills = collector.getSkills()

      if (skills.length === 0) {
        return `export const skills = []
`
      }

      const imports = skills.map(
        (skill) =>
          `import ${skill.importName} from '${skill.filePath.replace(/\.ts$/, '')}'`,
      )

      const skillsArrayEntries = skills.map((skill) => skill.importName)

      return `${imports.join('\n')}

export const skills = [
  ${skillsArrayEntries.join(',\n  ')}
]
`
    },
    () => {
      return `import type { SkillDefinition } from '${typesPath}'

export declare const skills: SkillDefinition[]
`
    },
    {
      context: 'server',
      write: true,
    },
  )
}
