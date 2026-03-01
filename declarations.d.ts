/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />

declare module '*?raw' {
  const content: string
  export default content
}

declare module '*.vue?blokkliEditing=true' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
