export default defineEventHandler(async () => {
  const storage = useUserSettingsStorage()
  try {

  const result = await storage.getItemRaw('user-settings')
  if (result instanceof Buffer) {
    return JSON.parse(result.toString())
  }
  } catch {
    return {}
  }

  return {}
})
