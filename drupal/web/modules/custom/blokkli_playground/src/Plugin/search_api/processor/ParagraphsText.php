<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\search_api\processor;

use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\TranslatableInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\search_api\Attribute\SearchApiProcessor;
use Drupal\search_api\Datasource\DatasourceInterface;
use Drupal\search_api\Item\ItemInterface;
use Drupal\search_api\Processor\ProcessorPluginBase;
use Drupal\search_api\Processor\ProcessorProperty;
use Drupal\search_api\SearchApiException;

/**
 * Adds the text of a node's paragraphs, in the indexed item's language.
 *
 * Rendering the node (the "rendered_item" processor) isn't enough here:
 * paragraphs without fields to translate (link lists, steps, columns,
 * galleries) aren't translatable, and Drupal renders their children in their
 * language instead of the node's. Here, each paragraph is taken in the item's
 * language when it has a translation. Library items are followed too.
 */
#[SearchApiProcessor(
  id: 'blokkli_playground_paragraphs_text',
  label: new TranslatableMarkup('Paragraphs text'),
  description: new TranslatableMarkup("Adds the text of a node's paragraphs, in the item's language."),
  stages: [
    'add_properties' => 0,
  ],
)]
final class ParagraphsText extends ProcessorPluginBase {

  /**
   * The property's name.
   */
  public const PROPERTY = 'blokkli_playground_paragraphs_text';

  /**
   * The field types whose values are text.
   */
  private const TEXT_TYPES = ['string', 'string_long', 'text', 'text_long', 'text_with_summary'];

  /**
   * Fields that aren't content, e.g. a fragment's machine name.
   */
  private const SKIPPED_FIELDS = ['field_blokkli_fragment_name'];

  /**
   * How deep paragraphs nest at most (section > accordion > columns > text).
   */
  private const MAX_DEPTH = 8;

  /**
   * {@inheritdoc}
   */
  public function getPropertyDefinitions(?DatasourceInterface $datasource = NULL): array {
    if ($datasource?->getEntityTypeId() !== 'node') {
      return [];
    }
    return [
      self::PROPERTY => new ProcessorProperty([
        'label' => $this->t('Paragraphs text'),
        'description' => $this->t("The text of the node's paragraphs, in the item's language."),
        'type' => 'string',
        'processor_id' => $this->getPluginId(),
      ]),
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function addFieldValues(ItemInterface $item): void {
    try {
      $entity = $item->getOriginalObject()?->getValue();
    }
    catch (SearchApiException) {
      return;
    }
    if (!$entity instanceof ContentEntityInterface) {
      return;
    }

    $texts = [];
    $this->collect($entity, $item->getLanguage(), $texts, 0);
    $fields = $this->getFieldsHelper()->filterForPropertyPath($item->getFields(), $item->getDatasourceId(), self::PROPERTY);
    foreach ($fields as $field) {
      foreach ($texts as $text) {
        $field->addValue($text);
      }
    }
  }

  /**
   * Collects the text of an entity's paragraphs, recursively.
   *
   * The node's own text fields (title, lead) are indexed as fields of their
   * own: only the paragraphs' count here.
   */
  private function collect(ContentEntityInterface $entity, string $langcode, array &$texts, int $depth): void {
    if ($depth > self::MAX_DEPTH) {
      return;
    }
    foreach ($entity->getFields(FALSE) as $name => $items) {
      $definition = $items->getFieldDefinition();
      $type = $definition->getType();
      if (in_array($name, self::SKIPPED_FIELDS, TRUE) || $definition->getFieldStorageDefinition()->isBaseField()) {
        continue;
      }
      if ($depth > 0 && in_array($type, self::TEXT_TYPES, TRUE)) {
        foreach ($items->getValue() as $value) {
          $text = trim((string) ($value['value'] ?? ''));
          if ($text !== '') {
            $texts[] = $text;
          }
        }
      }
      elseif ($type === 'entity_reference_revisions' || ($type === 'entity_reference' && $definition->getSetting('target_type') === 'paragraphs_library_item')) {
        foreach ($items->referencedEntities() as $child) {
          if ($child instanceof TranslatableInterface && $child->hasTranslation($langcode)) {
            $child = $child->getTranslation($langcode);
          }
          if ($child instanceof ContentEntityInterface) {
            $this->collect($child, $langcode, $texts, $depth + 1);
          }
        }
      }
    }
  }

}
