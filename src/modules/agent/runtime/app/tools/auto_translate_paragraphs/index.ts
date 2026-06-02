import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
} from '../../helpers/validation'
import { onlyUnique } from '#blokkli/helpers'
import { fieldDiffResultSchema } from '../schemas'
import { stringArrayParam } from '../schemas'
import { resolveHost } from '../helpers'
import { skippedFieldsMessage, type SkippedField } from '../fieldDiffApproval'
import Component from './Component.vue'
import DetailsComponent from '../../components/FieldDiffDetails/index.vue'

const paramsSchema = z.object({
  uuids: stringArrayParam(
    "UUIDs of paragraphs to auto-translate. Every editable text field on each paragraph is sent to the backend's translation service. The user reviews and accepts/rejects each translation before it is applied. The source language is always the host entity's source language; the target language is the currently-edited language.",
  ),
})

export type AutoTranslateParams = z.infer<typeof paramsSchema>
export type AutoTranslateResult = z.infer<typeof fieldDiffResultSchema>

/**
 * Resolved params handed to the Component after `execute` has validated the
 * UUIDs. `uuids` only contains paragraphs that exist; `skipped` lists the
 * dropped references so the Component can report them back to the agent.
 */
export type ComponentParams = {
  uuids: string[]
  skipped: SkippedField[]
}

export default defineBlokkliAgentTool({
  name: 'auto_translate_paragraphs',
  description:
    "Translate every editable text field of one or more paragraphs into the currently-edited language using the backend's configured translation service (e.g. DeepL via Drupal) — not the agent's own LLM. The user reviews each translation in a diff approval UI before it is applied. Only available in translating mode and only when the adapter exposes a translation service. Prefer this when the user asks for an automatic translation; use `delegate_text_rewrite` with `template: 'translate'` only when the user specifically wants the agent to do the translation, or when no backend translation service is configured.",
  category: 'mutation',
  lazy: true,
  modes: ['translating'],
  prunedSummary: (r) =>
    `${r.acceptedCount || 0} accepted, ${Object.keys(r.rejectedByUser || {}).length} rejected`,
  label($t) {
    return $t('aiAgentAutoTranslateRunning', 'Auto-translating', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema: fieldDiffResultSchema,
  requiredAdapterMethods: [
    'loadTextFieldValuesForLanguage',
    'requestTranslation',
    'importTranslationsBatched',
  ],
  component: Component,
  detailsComponent: DetailsComponent,
  buildDetails: (result) => result,
  execute(ctx, params) {
    if (ctx.app.state.editMode.value !== 'translating') {
      return {
        error:
          'auto_translate_paragraphs is only available when the editor is in translating mode.',
      }
    }

    const skipped: SkippedField[] = []
    const keptUuids: string[] = []

    for (const uuid of params.uuids) {
      const host = resolveHost(ctx.app, uuid)
      if (!host) {
        skipped.push({ uuid, fieldName: '*', reason: 'paragraph not found' })
        continue
      }
      keptUuids.push(uuid)
    }

    if (!keptUuids.length) {
      return {
        error:
          skippedFieldsMessage(skipped) ?? 'No paragraph UUIDs were provided.',
      }
    }

    const bundles = keptUuids
      .map((uuid) => ctx.app.blocks.getBlock(uuid)?.bundle)
      .filter((b): b is string => !!b)
      .filter(onlyUnique)

    if (bundles.length) {
      const denied = requireBundlePermission(ctx.app, bundles, 'edit')
      if (denied) return denied
    }

    const ancestorDenied = requireNoRestrictedAncestor(ctx.app, keptUuids)
    if (ancestorDenied) return ancestorDenied

    return {
      uuids: keptUuids,
      skipped,
    } satisfies ComponentParams
  },
  mockParams: () => ({
    uuids: [
      '4526d2d0-f122-4093-902f-e2f00a433981',
      '9485812c-0ecd-4699-85b2-3a031d47a0a1',
    ],
  }),
})
