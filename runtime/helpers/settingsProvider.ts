export default function () {
  const settings = ref<Record<string, any>>({})

  watch(
    () => Object.values(settings.value),
    () => {
      window.localStorage.setItem(
        '_pb_settings',
        JSON.stringify(settings.value),
      )
    },
  )

  function restoreSettings() {
    try {
      const stringified = localStorage.getItem('_pb_settings')
      if (stringified) {
        const data = JSON.parse(stringified)
        if (data && typeof data === 'object' && data !== null) {
          settings.value = data
        }
        return
      }
    } catch (_e) {}
    // Set defaults if no custom settings found.
    settings.value.showImport = true
    settings.value.persistCanvas = true
  }

  onBeforeMount(restoreSettings)

  return { settings }
}
