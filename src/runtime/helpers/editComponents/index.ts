import {
  PROXY_COMPONENTS,
  DIFF_COMPONENTS,
} from '#blokkli-build/edit-components'

export function getBlokkliItemProxyComponent(bundle: string): any {
  return PROXY_COMPONENTS[bundle]
}

export function getBlokkliItemDiffComponent(bundle: string): any {
  return DIFF_COMPONENTS[bundle]
}
