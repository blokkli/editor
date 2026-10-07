/**
 * The current sandbox (Query.sandbox), for the sandbox's popup and the
 * welcome page: when it's deleted, and the links that log its users in, with
 * the state of copying one. Null on the dev site and in sandboxes made with
 * drush. Loaded in the browser only.
 */
export function useSandbox() {
  const language = useLanguage()

  // The roles' labels are in the page's language. The query has no variables,
  // so the language goes into the key.
  const { data: sandbox } = useAsyncData(
    () => `sandbox:${language.value}`,
    () => useGraphqlQuery('sandbox').then((response) => response.data.sandbox),
    { server: false },
  )

  // When the sandbox is deleted at the latest, in the page's language.
  const expiresDate = computed(() =>
    sandbox.value
      ? new Intl.DateTimeFormat(LOCALES[language.value], {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(sandbox.value.expires * 1000))
      : '',
  )

  // After how many hours without use it's deleted earlier, if it is.
  const idleHours = computed(() => {
    const idle = sandbox.value?.idleLifetime
    return idle ? Math.round(idle / 3600) : null
  })

  const ownLogin = computed(() =>
    sandbox.value?.logins.find((login) => login.isCurrentUser),
  )

  const colleagues = computed(
    () => sandbox.value?.logins.filter((login) => !login.isCurrentUser) ?? [],
  )

  // The URL just copied: its button says so for two seconds.
  const copied = ref<string | null>(null)

  async function copy(url: string) {
    await navigator.clipboard.writeText(url)
    copied.value = url
    setTimeout(() => {
      if (copied.value === url) {
        copied.value = null
      }
    }, 2000)
  }

  return {
    sandbox,
    expiresDate,
    idleHours,
    ownLogin,
    colleagues,
    copied,
    copy,
  }
}
