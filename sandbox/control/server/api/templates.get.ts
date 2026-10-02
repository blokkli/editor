import { defineEventHandler } from 'h3'
import { availableSources } from '../utils/sandboxes'

/**
 * The content languages a sandbox can have: those with a template.
 */
export default defineEventHandler(() => availableSources())
