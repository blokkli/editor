import features from './../../playground/.nuxt/blokkli/features.json'

export default {
  paths() {
    return features.map((feature) => {
      return {
        params: {
          id: feature.id,
          title: feature.definition.label,
          description: feature.definition.description,
          requiredAdapterMethods:
            feature.definition.requiredAdapterMethods || [],
          sourceUrl:
            'https://www.github.com/blokkli/editor/tree/main' +
            feature.repoRelativePath,

          settings: Object.entries(feature.definition.settings || {}).map(
            ([key, setting]) => {
              return {
                key,
                label: setting.label,
                type: setting.type,
                default: setting.default,
              }
            },
          ),
        },
        content: feature.docs,
      }
    })
  },
}
