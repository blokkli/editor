import {
  blocks,
  fragments,
  type BlockDefinition,
  type FragmentDefinition,
} from '#blokkli-build/definitions'
import type {
  ValidFieldListTypes,
  BlockBundleWithNested,
} from '#blokkli-build/generated-types'

const blocksByKey = blocks.reduce<Record<string, BlockDefinition>>((acc, v) => {
  const renderForValue = v.renderFor || []
  const renderForList = Array.isArray(renderForValue)
    ? renderForValue
    : [renderForValue]

  if (renderForList.length) {
    renderForList.forEach((renderFor) => {
      if ('parentBundle' in renderFor) {
        acc[v.bundle + '__' + 'parent:' + renderFor.parentBundle] = v
      } else if ('fieldList' in renderFor) {
        acc[v.bundle + '__' + 'field:' + renderFor.fieldList] = v
      } else if ('fieldListType' in renderFor) {
        acc[v.bundle + '__' + 'field:' + renderFor.fieldListType] = v
      }
    })
  } else {
    acc[v.bundle] = v
  }
  return acc
}, {})

const fragmentsByName = fragments.reduce<Record<string, FragmentDefinition>>(
  (acc, v) => {
    acc[v.name] = v
    return acc
  },
  {},
)

export function getBlockDefinition(
  bundle: string,
  fieldListType: ValidFieldListTypes,
  parentBundle?: BlockBundleWithNested,
): BlockDefinition | undefined {
  const forFieldListType = bundle + '__field:' + fieldListType
  if (blocksByKey[forFieldListType]) {
    return blocksByKey[forFieldListType]
  }
  if (parentBundle) {
    const forParentBundle = bundle + '__parent:' + parentBundle
    if (blocksByKey[forParentBundle]) {
      return blocksByKey[forParentBundle]
    }
  }

  return blocksByKey[bundle]
}

export function getFragmentDefinition(
  name: string,
): FragmentDefinition | undefined {
  return fragmentsByName[name]
}

export function getDefaultDefinition(
  bundle: string,
): BlockDefinition | undefined {
  return blocksByKey[bundle]
}
