import features from './../../playground/.nuxt/blokkli/features-data.json'

export default {
  paths() {
    return features
      .filter((v) => v.definition.id !== 'demo-feature')
      .map((feature) => {
        return {
          params: {
            id: feature.definition.id,
            title: feature.definition.definition.label,
            description: feature.definition.definition.description,
            requiredAdapterMethods:
              feature.definition.definition.requiredAdapterMethods || [],
            sourceUrl:
              'https://www.github.com/blokkli/editor/tree/main' +
              feature.repoRelativePath,

            settings: Object.entries(
              feature.definition.definition.settings || {},
            ).map(([key, setting]) => {
              return {
                key,
                label: setting.label,
                type: setting.type,
                default: setting.default,
              }
            }),

            screenshot: feature.definition.definition.screenshot,
          },
          content: feature.docs,
        }
      })
  },
}
