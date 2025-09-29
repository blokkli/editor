export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const storage = useUserSettingsStorage()
  return storage.setItemRaw('user-settings', body.data)
})
