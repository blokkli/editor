export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const storage = useStorage()
  return storage.setItemRaw('user-settings', body.data)
})
