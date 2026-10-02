<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Hook;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Access\AccessResultInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Session\AccountInterface;
use Drupal\system\MenuInterface;

/**
 * Lets the frontend load the main menu and the administration menu.
 *
 * GraphQL returns a menu only to users who may view it, which Drupal allows
 * only with "administer menu". The frontend renders the main menu in its
 * header, and the administration menu in the toolbar (vuepal). The links
 * themselves are still checked for access.
 */
final class MenuHooks {

  /**
   * Implements hook_ENTITY_TYPE_access() for menu.
   */
  #[Hook('menu_access')]
  public function access(MenuInterface $menu, string $operation, AccountInterface $account): AccessResultInterface {
    if ($operation !== 'view') {
      return AccessResult::neutral();
    }
    return match ($menu->id()) {
      'main' => AccessResult::allowed(),
      'admin' => AccessResult::allowedIfHasPermission($account, 'access toolbar'),
      default => AccessResult::neutral(),
    };
  }

}
