import type { AnalyzeNode, Analyzer } from '../types'

/**
 * Built-in analyzer that surfaces backend-reported validation violations
 * (`state.violations`) inside the analyze sidebar. Always registered by the
 * analyze provider — adapters do not need to opt in.
 *
 * Violations intentionally carry no `identifier` so they cannot be ignored:
 * a validation error must be resolved, not silenced.
 */
export const validationsAnalyzer: Analyzer = {
  id: 'blokkli:validations',
  type: 'generic',
  label: (_langcode, $t) => $t('analyzerValidationsLabel', 'Validations'),
  continuous: true,
  run(context) {
    const { violations, $t } = context
    const title = $t('analyzerValidationsLabel', 'Validations')

    if (!violations.length) {
      return {
        id: 'blokkli:validations:pass',
        title,
        category: 'content',
        description: $t(
          'analyzerValidationsPassDescription',
          'No validation errors for the current state.',
        ),
        status: 'pass',
        nodes: [],
      }
    }

    const nodes: AnalyzeNode[] = violations.map((violation) => ({
      description: violation.message,
      uuid: violation.entityUuid,
      targets: violation.entityUuid ? [{ uuid: violation.entityUuid }] : [],
    }))

    return {
      id: 'blokkli:validations:failed',
      title,
      category: 'content',
      description: $t(
        'analyzerValidationsDescription',
        'Validation errors reported for the current state.',
      ),
      status: 'violation',
      nodes,
    }
  },
}
