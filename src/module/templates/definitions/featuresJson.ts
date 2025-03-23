import { defineFileTemplate } from '../defineTemplate'
import { fileExists } from './../../../helpers'

export default defineFileTemplate('features-data.json', async (ctx) => {
  const features = [...ctx.features.files.values()]
  const featuresData = await Promise.all(
    features.map(async (v) => {
      const docsPath = v.filePath.replace('index.vue', 'docs.md')
      let docs = ''
      if (fileExists(docsPath)) {
        docs = await ctx.helper.fileCache.read(docsPath)
      }
      return {
        ...v,
        repoRelativePath: v.filePath.replace(/.*\/src/, '/src'),
        docs,
      }
    }),
  )

  return JSON.stringify(featuresData, null, 2)
})
