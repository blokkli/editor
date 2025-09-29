export default defineEventHandler(() => {
  const storage = useStorage()
  return storage.getItemRaw('user-settings')
})
