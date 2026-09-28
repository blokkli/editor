<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Hook;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Access\AccessResultInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Session\AccountInterface;
use Drupal\paragraphs\ParagraphsTypeInterface;

/**
 * Lets blökkli's users view paragraph types.
 *
 * The editor loads the paragraph types through GraphQL, which only returns
 * the ones the user may view. Paragraphs allows that only with "administer
 * paragraphs types", so editors would get no paragraph types at all.
 */
final class ParagraphsTypeHooks {

  /**
   * Implements hook_ENTITY_TYPE_access() for paragraphs_type.
   */
  #[Hook('paragraphs_type_access')]
  public function access(ParagraphsTypeInterface $type, string $operation, AccountInterface $account): AccessResultInterface {
    if ($operation !== 'view') {
      return AccessResult::neutral();
    }
    return AccessResult::allowedIfHasPermission($account, 'view paragraphs blokkli edit state');
  }

}
