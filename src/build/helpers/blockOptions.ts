import type {
  BlockOptionDefinitionBase,
  RuntimeBlockOptionArray,
} from '../../global/types/blockOptions'

export function toRuntimeOptionArray(
  option: BlockOptionDefinitionBase,
): RuntimeBlockOptionArray {
  if (option.type === 'radios') {
    return [option.type, option.default, Object.keys(option.options)]
  } else if (option.type === 'checkboxes') {
    return [option.type, option.default, Object.keys(option.options)]
  } else if (option.type === 'number') {
    const hasBounds = option.min !== undefined || option.max !== undefined
    if (option.nullable) {
      return [
        option.type,
        option.default,
        [option.min, option.max],
        true,
      ]
    }
    if (hasBounds) {
      return [option.type, option.default, [option.min, option.max]]
    }
    return [option.type, option.default]
  } else if (option.type === 'range') {
    return [option.type, option.default, [option.min, option.max]]
  } else if (option.type === 'datetime-local') {
    if (option.min !== undefined || option.max !== undefined) {
      return [option.type, option.default, [option.min, option.max]]
    }
    return [option.type, option.default]
  } else if (option.type === 'checkbox') {
    return [option.type, option.default]
  } else if (option.type === 'color') {
    return [option.type, option.default]
  } else if (option.type === 'json') {
    if (option.dataType) {
      return [option.type, option.default, option.dataType]
    }
    return [option.type, option.default]
  }
  return [option.type, option.default]
}
