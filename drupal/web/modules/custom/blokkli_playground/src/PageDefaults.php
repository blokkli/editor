<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground;

use Drupal\Core\Entity\FieldableEntityInterface;

/**
 * Default values of the detail page's fields.
 */
final class PageDefaults {

  /**
   * The default value callback of the detail page's field_aside.
   *
   * A new detail page starts with the contact fragment in its sidebar. It shows
   * the page's responsible office (field_office). Editors can add blocks before
   * or after it, or remove it. The field saves the new paragraph with the page.
   */
  public static function sidebar(FieldableEntityInterface $entity): array {
    $fragment = \Drupal::entityTypeManager()->getStorage('paragraph')->create([
      'type' => 'blokkli_fragment',
      'langcode' => $entity->language()->getId(),
      'field_blokkli_fragment_name' => 'office_contact',
    ]);
    return [['entity' => $fragment]];
  }

}
