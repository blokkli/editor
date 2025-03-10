import { resolveFiles } from '@nuxt/kit'
import { basename } from 'node:path'
import { Collector } from './index'
import { relative } from 'pathe'

function toValidVariableName(input: string): string {
  // Replace non-alphanumeric characters with underscores.
  let result = input.replace(/\W/g, '_')

  // Ensure the first character is not a number.
  if (/^\d/.test(result)) {
    result = '_' + result
  }

  // Handle empty string edge case
  if (result === '') {
    result = '_empty'
  }

  return result
}

export class IconCollector extends Collector {
  async init(srcFromModule: string) {
    const filesModule = await resolveFiles(srcFromModule, '*.svg')
    const filesApp = await resolveFiles(
      this.context.srcDir,
      '**/icon-blokkli-*.svg',
    )
    const allFiles = [...filesModule, ...filesApp]
    allFiles.forEach((filePath) => this.addFile(filePath))
  }

  generateTemplate() {
    const imports: string[] = []
    const icons: string[] = []

    const files = this.files.values()

    for (const file of files) {
      const name = basename(file.filePath, '.svg').toLowerCase()
      const importName = 'icon_' + toValidVariableName(name)
      imports.push(
        `import ${importName} from '${relative(this.context.blokkliBuildDir, file.filePath)}?raw'`,
      )
      icons.push(`'${name}': ${importName}`)
    }

    return `${imports.join('\n')}

export const icons = {
${icons.join(',\n  ')}
}

export type BlokkliIcon = keyof typeof icons`
  }
}
