export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const storage = useUserSettingsStorage()
  await storage.setItemRaw('user-settings', body.data)
  return 'OK'
})
