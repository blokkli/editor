# getGridMarkup()

This method should return the HTML markup to display the grid overlay in the
editor.

The method is called when the user enables the "Grid" view overlay in the
editor.

The resulting markup will be rendered in a div that is a child of `<body>`.

## Example

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import { defineBlokkliEditAdapter } from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    getGridMarkup: () => {
      return `<div class="container">${Array(12)
        .fill('<div></div>')
        .join('')}</div>`
    },
  }
})
```

:::

It's up to the specific implementation to style the grid. An example style could
look like this:

```postcss
.bk-grid-overlay {
  @apply fixed top-0 left-0 w-full z-[99999999] h-full pointer-events-none;
  .container {
    @apply grid grid-cols-12 gap-40 h-full;
    > div {
      @apply h-full  border-l-[0.75px] border-l-black/40 border-r-[0.75px] border-r-black/40;
    }
  }
}
```
