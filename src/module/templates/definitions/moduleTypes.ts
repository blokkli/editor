import { defineCodeTemplate } from '../defineTemplate'

export default defineCodeTemplate(
  'module-types',
  () => {
    return `export {}`
  },
  (ctx) => {
    const features = ctx.features.getEnabledFeatures()
    const settings: string[] = []

    features.forEach((feature) => {
      if (feature.definition.settings) {
        Object.entries(feature.definition.settings)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([key, setting]) => {
            const settingsKey = `feature:${feature.id}:${key}`
            settings.push(`// ${setting.label}`)
            if (setting.type === 'radios') {
              const type = Object.keys(setting.options)
                .map((v) => `'${v}'`)
                .join(' | ')
              settings.push(
                `'${settingsKey}'?: { disable?: boolean, default?: ${type} }`,
              )
            } else if (setting.type === 'checkbox') {
              settings.push(
                `'${settingsKey}'?: { disable?: boolean, default?: boolean }`,
              )
            } else if (setting.type === 'slider') {
              settings.push(
                `'${settingsKey}'?: { disable?: boolean, default?: number }`,
              )
            } else {
              settings.push(`'${settingsKey}'?: { disable?: boolean }`)
            }
          })
      }
    })

    return `
export type ModuleOptionsSettings = {
  ${settings.sort().join('\n  ')}
}
  `
  },
  {
    dependencies: ['features'],
  },
)
