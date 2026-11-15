<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\ParagraphsBlokkli\Mutation;

use Drupal\Core\Plugin\Context\ContextDefinition;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\paragraphs_blokkli\Attribute\ParagraphMutation;
use Drupal\paragraphs_blokkli\Exception\MutationBadDataException;
use Drupal\paragraphs_blokkli\ParagraphMutationContextInterface;
use Drupal\paragraphs_blokkli\ParagraphsBlokkliHelper;
use Drupal\paragraphs_blokkli\Plugin\ParagraphsBlokkli\AddMutationBase;

/**
 * Sets a composition's whole state: its source and its children.
 *
 * The children are the paragraphs that the composition's markup places. The
 * mutation gets all of them: a child it already has gets the given values and
 * options, a new one is created, and one that the list leaves out is removed.
 * Nothing is parsed here: the source is checked when it's output.
 *
 * A child's texts are written in the given language, into its translation; a
 * change in the host's source language marks the other translations as
 * outdated. Its references are the same in every language.
 *
 * The children come as JSON: the edit extension only builds GraphQL input
 * types for the module's own mutations.
 */
#[ParagraphMutation(
  id: "update_composition",
  label: new TranslatableMarkup("Update composition"),
  description: new TranslatableMarkup("Sets a composition's source and its children."),
  arguments: [
    "uuid" => new ContextDefinition(
      data_type: "string",
      label: new TranslatableMarkup("The UUID of the composition."),
    ),
    "langcode" => new ContextDefinition(
      data_type: "string",
      label: new TranslatableMarkup("The language of the children's texts."),
      required: FALSE,
    ),
    "optionKey" => new ContextDefinition(
      data_type: "string",
      label: new TranslatableMarkup("The option that holds the source."),
    ),
    "value" => new ContextDefinition(
      data_type: "string",
      label: new TranslatableMarkup("The option's value."),
    ),
    "fieldName" => new ContextDefinition(
      data_type: "string",
      label: new TranslatableMarkup("The field of the children."),
    ),
    "children" => new ContextDefinition(
      data_type: "string",
      label: new TranslatableMarkup("The children as JSON: uuid, bundle, values and options of each."),
    ),
  ]
)]
class UpdateComposition extends AddMutationBase {

  /**
   * Execute the mutation.
   *
   * @param \Drupal\paragraphs_blokkli\ParagraphMutationContextInterface $context
   *   The paragraph mutation context.
   * @param string $uuid
   *   The UUID of the composition.
   * @param string|null $langcode
   *   The language of the children's texts. A mutation stored before it had
   *   one wrote in the host's source language.
   * @param string $optionKey
   *   The option that holds the source.
   * @param string $value
   *   The option's value.
   * @param string $fieldName
   *   The field of the children.
   * @param string $children
   *   The children as JSON.
   *
   * @throws \Drupal\paragraphs_blokkli\Exception\MutationBadDataException
   */
  public function execute(
    ParagraphMutationContextInterface $context,
    string $uuid,
    ?string $langcode,
    string $optionKey,
    string $value,
    string $fieldName,
    string $children,
  ): void {
    $langcode ??= $context->getHostSourceLangcode();
    $composition = $context->getProxy($uuid);
    if (!$composition || $context->isDeleted($uuid)) {
      throw new MutationBadDataException('The composition does not exist.');
    }

    $items = json_decode($children, TRUE);
    if (!is_array($items)) {
      throw new MutationBadDataException('The children are not a JSON list.');
    }

    if ($this->isFirstRun()) {
      $this->paragraphsBlokkliHelper->checkParagraphUpdateAccess($composition->getParagraph()->bundle());
      $this->paragraphsBlokkliHelper->checkHostUpdateAccessRecursive(
        $context, $composition->getHostEntityType(), $composition->getHostUuid(), $composition->getHostFieldName()
      );
    }

    $composition->setBehaviorSetting('paragraphs_blokkli_data', $optionKey, $value);

    // The children it has now.
    $existing = [];
    foreach ($context->getProxiesForHost('paragraph', $uuid) as $proxy) {
      if ($proxy->getHostFieldName() === $fieldName && !$context->isDeleted($proxy->uuid())) {
        $existing[$proxy->uuid()] = $proxy;
      }
    }

    $kept = [];
    $precedingUuid = NULL;
    foreach ($items as $index => $item) {
      if (!is_array($item) || empty($item['uuid']) || empty($item['bundle'])) {
        throw new MutationBadDataException(sprintf('Child %d has no UUID or bundle.', $index));
      }
      $childUuid = (string) $item['uuid'];
      $values = $this->sanitizePayloadValues($item['values'] ?? NULL, TRUE);
      $proxy = $existing[$childUuid] ?? NULL;

      if ($proxy) {
        $paragraph = $proxy->getParagraph();
        $changed = FALSE;
        foreach ($values as $name => $fieldValue) {
          $name = (string) $name;
          if (!$paragraph->hasField($name)) {
            continue;
          }
          if ($this->isFirstRun()) {
            $this->paragraphsBlokkliHelper->checkFieldUpdateAccess($paragraph, $name);
          }
          // A text goes into the language's translation, in its format.
          if (is_string($fieldValue) && ParagraphsBlokkliHelper::getTextFieldType($paragraph->getFieldDefinition($name))) {
            $translation = $this->getTranslationToWrite($paragraph, $langcode);
            $before = $translation->get($name)->getValue();
            $this->updateTextFieldValue($paragraph, $langcode, $name, $fieldValue);
            $changed = $changed || $translation->get($name)->getValue() != $before;
            continue;
          }
          $before = $paragraph->get($name)->getValue();
          if (is_string($fieldValue)) {
            $fieldValue = $this->normalizeFieldValue($paragraph->get($name), $fieldValue);
          }
          $paragraph->set($name, $fieldValue);
          $changed = $changed || $paragraph->get($name)->getValue() != $before;
        }
        if ($changed) {
          $paragraph->setNeedsSave(TRUE);
          if ($langcode === $context->getHostSourceLangcode()) {
            $context->markTranslationsOutdated($childUuid);
          }
        }
      }
      else {
        if ($this->isFirstRun()) {
          $this->paragraphsBlokkliHelper->checkParagraphCreateAccess((string) $item['bundle']);
          $check = $this->createNewParagraph(['type' => $item['bundle']]);
          foreach (array_keys($values) as $name) {
            $this->paragraphsBlokkliHelper->checkFieldUpdateAccess($check, (string) $name);
          }
        }
        $proxy = $this->createAndAddParagraphWithTemplate(
          $context,
          (string) $item['bundle'],
          'paragraph',
          $uuid,
          $fieldName,
          $values,
          $precedingUuid,
          $childUuid,
          'child_' . $childUuid,
          FALSE,
          [],
          TRUE,
        );
      }

      foreach ($item['options'] ?? [] as $key => $optionValue) {
        $proxy->setBehaviorSetting('paragraphs_blokkli_data', (string) $key, (string) $optionValue);
      }
      $kept[$childUuid] = TRUE;
      $precedingUuid = $childUuid;
    }

    foreach ($existing as $childUuid => $proxy) {
      if (!isset($kept[$childUuid])) {
        if ($this->isFirstRun()) {
          $this->paragraphsBlokkliHelper->checkParagraphDeleteAccess($proxy->getParagraph()->bundle());
        }
        $context->markAsDeleted($childUuid);
      }
    }
  }

}
