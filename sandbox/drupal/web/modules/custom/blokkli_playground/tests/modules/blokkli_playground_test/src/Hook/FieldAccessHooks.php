<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground_test\Hook;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Access\AccessResultInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Session\AccountInterface;

/**
 * Locks some fields for the field-restricted editor.
 *
 * The Field Permissions module could do the same. The E2E tests check that
 * the editor offers no change to them: a paragraphs field of the page and one
 * of a paragraph, a text and a reference field, and the options of the page.
 */
final class FieldAccessHooks {

  /**
   * The role that may not edit the locked fields.
   */
  public const ROLE = 'field_restricted_editor';

  /**
   * The locked fields, as "entity type.bundle.field name".
   */
  public const LOCKED_FIELDS = [
    'node.page.field_aside',
    'node.editorial.field_host_options',
    'paragraph.columns.field_right',
    'paragraph.widget.field_title',
    'paragraph.widget.field_media_items',
  ];

  /**
   * Implements hook_entity_field_access().
   */
  #[Hook('entity_field_access')]
  public function fieldAccess(string $operation, FieldDefinitionInterface $fieldDefinition, AccountInterface $account, ?FieldItemListInterface $items = NULL): AccessResultInterface {
    $key = implode('.', [
      $fieldDefinition->getTargetEntityTypeId(),
      $fieldDefinition->getTargetBundle(),
      $fieldDefinition->getName(),
    ]);
    $isLocked = $operation === 'edit'
      && in_array($key, self::LOCKED_FIELDS, TRUE)
      && in_array(self::ROLE, $account->getRoles(), TRUE);
    return AccessResult::forbiddenIf($isLocked)->addCacheContexts(['user.roles']);
  }

}
