import { defineVuepalAdapter } from 'vuepal/adapter'

export default defineVuepalAdapter(() => {
  return {
    getAdminMenu() {
      return useGraphqlQuery('adminToolbar').then((v) => v.data)
    },
    getLocalTasks(path: string) {
      return useGraphqlQuery('localTasks', { path }).then((v) =>
        v.data.route && 'localTasks' in v.data.route
          ? v.data.route.localTasks
          : [],
      )
    },
    getCurrentLanguage() {
      return useLanguage()
    },
  }
})
