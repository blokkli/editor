import icons from './definitions/icons'
import features from './definitions/features'
import featuresJson from './definitions/featuresJson'
import translations from './definitions/translations'
import editAdapter from './definitions/editAdapter'
import adapterExtensions from './definitions/adapterExtensions'
import styles from './definitions/styles'
import config from './definitions/config'
import editorConfig from './definitions/editorConfig'
import definitions from './definitions/definitions'
import moduleTypes from './definitions/moduleTypes'
import runtimeOptions from './definitions/runtimeOptions'
import editComponents from './definitions/editComponents'
import generatedTypes from './definitions/generatedTypes'
import defaultGlobalOptions from './definitions/defaultGlobalOptions'
import imports from './definitions/imports'
import optionsSchema from './definitions/optionsSchema'
import chunkGroup from './definitions/chunkGroup'
import chunkEditing from './definitions/chunkEditing'
import importMeta from './definitions/importMeta'
import materialIcons from './definitions/materialIcons'
import type { ModuleTemplate } from './defineTemplate'
import type { ModuleHelper } from '../ModuleHelper'

type Template =
  | ModuleTemplate
  | ((helper: ModuleHelper) => ModuleTemplate | ModuleTemplate[])

export const TEMPLATES: Template[] = [
  icons,
  features,
  featuresJson,
  translations,
  editAdapter,
  adapterExtensions,
  styles,
  config,
  editorConfig,
  definitions,
  moduleTypes,
  runtimeOptions,
  editComponents,
  generatedTypes,
  defaultGlobalOptions,
  imports,
  optionsSchema,
  chunkGroup,
  chunkEditing,
  importMeta,
  materialIcons,
]
