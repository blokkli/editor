 
const selectorParser = require('postcss-selector-parser')

const plugin = () => ({
  postcssPlugin: 'postcss-mangle-blokkli-classes',
  OnceExit(root) {
    root.walkRules((rule) => {
      // Skip keyframe rules — their selectors are percentages/names, not classes.
      if (
        rule.parent &&
        rule.parent.type === 'atrule' &&
        rule.parent.name === 'keyframes'
      ) {
        return
      }

      rule.selector = selectorParser((selectors) => {
        selectors.each((selector) => {
          let hasMangled = false
          let hasBk = false

          // Rename non-bk classes and track state.
          selector.walkClasses((classNode) => {
            if (classNode.value === 'bk') {
              hasBk = true
              return
            }
            if (classNode.value.startsWith('bk-')) return
            classNode.value = '_bk_' + classNode.value
            hasMangled = true
          })

          // Scope mangled selectors under .bk if not already present.
          if (hasMangled && !hasBk) {
            // Descendant version: .bk <selector>
            const descendant = selector.clone()
            descendant.prepend(selectorParser.combinator({ value: ' ' }))
            descendant.prepend(selectorParser.className({ value: 'bk' }))

            // Compound version: .bk<selector> (for when utility is on the root element)
            const compound = selector.clone()
            compound.prepend(selectorParser.className({ value: 'bk' }))

            // Replace original selector with both scoped versions.
            selector.replaceWith(descendant, compound)
          }
        })
      }).processSync(rule.selector)
    })
  },
})

plugin.postcss = true

module.exports = plugin
