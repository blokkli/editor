import DOMPurify from 'dompurify'

type DefaultPolicyRules = {
  createHTML(html: string): string
}

type TrustedTypesFactory = {
  createPolicy(name: string, rules: DefaultPolicyRules): unknown
}

/**
 * The page's `default` Trusted Types policy, as a project that enforces them
 * needs one. The editor brings its own policy for its markup (`blokkli`); its
 * dependencies pass strings: TipTap parses the content of the comment editor,
 * turndown the markup it converts to Markdown, ECharts empties its SVG. They
 * get DOMPurify's result. turndown wraps the markup in an element of its own,
 * which DOMPurify would remove.
 */
export default defineNuxtPlugin({
  name: 'sandbox:trusted-types',
  setup() {
    const factory = (window as { trustedTypes?: TrustedTypesFactory })
      .trustedTypes
    factory?.createPolicy('default', {
      createHTML: (html) =>
        DOMPurify.sanitize(html, { ADD_TAGS: ['x-turndown'] }),
    })
  },
})
