import { defineFileTemplate } from '../defineTemplate'

export default defineFileTemplate('theme.css', (ctx) => {
  return ctx.theme.css
})
