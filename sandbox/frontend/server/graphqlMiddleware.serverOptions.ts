import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'

export default defineGraphqlServerOptions<{ language?: string }>({
  // Every language has its own endpoint, e.g. /de/graphql.
  graphqlEndpoint(_event, _operation, _operationName, context) {
    const language = context?.client?.language
    const langcode = isLanguage(language) ? language : DEFAULT_LANGUAGE
    return `${useRuntimeConfig().drupalUrl}/${langcode}/graphql`
  },

  serverFetchOptions(event) {
    return {
      headers: pickForwardedHeaders(getRequestHeaders(event)),
    }
  },

  onServerResponse(event, response) {
    // Drupal may renew the session.
    for (const cookie of response.headers.getSetCookie()) {
      appendResponseHeader(event, 'set-cookie', cookie)
    }
    return response._data!
  },

  // Keep Drupal's status, so that the page can tell "private" (403) apart.
  onServerError(_event, error) {
    throw createError({
      statusCode: error.statusCode ?? 500,
      statusMessage: error.statusMessage,
    })
  },
})
