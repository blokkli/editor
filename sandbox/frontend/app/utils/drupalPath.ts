// The paths nginx sends to Drupal instead of Nuxt, with an optional language
// prefix: the three Drupal locations of .ddev/nginx_full/nginx-site.conf.
// test/unit/drupal-path.test.ts checks them against `ddev check-routes`.
const DRUPAL_PATHS = [
  /^(?:\/(?:en|de|fr))?\/(?:admin|batch|big_pipe|block|block-category|blokkli-sandbox|ckeditor5|comment|comments|contextual|core|cron|editor|entity_reference_autocomplete|file|filter|graphql|history|layout_builder|libraries|masquerade|media|media-library|modules|paragraphs_blokkli|paragraphs_blokkli_graphql|profiles|scheduler|session|sites|system|themes|token|toolbar|unmasquerade|user|views)(?:\/|$)/,
  /^(?:\/(?:en|de|fr))?\/(?:node|taxonomy\/term)\/(?:add|preview|\d+\/(?:edit|delete|revisions|translations|usage))(?:\/|$)/,
  /^\/(?:\.well-known\/|index\.php$|update\.php(?:\/|$))/,
]

/**
 * Whether Drupal renders the page at this path, e.g. a node's edit form or a
 * file, so that a link to it has to load the whole page.
 */
export function isDrupalPath(path: string): boolean {
  return DRUPAL_PATHS.some((pattern) => pattern.test(path))
}
