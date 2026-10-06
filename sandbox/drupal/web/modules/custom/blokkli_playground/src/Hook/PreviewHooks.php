<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Hook;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Access\AccessResultInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityPublishedInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Session\AccountInterface;
use Drupal\paragraphs_blokkli\PreviewGrantChecker;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Lets a preview grant show a page that isn't published yet.
 *
 * Its visitors may view published content only (AnonymousViewerAccessPolicy),
 * but "Preview on smartphone" also shares the changes of a new page.
 */
final class PreviewHooks {

  public function __construct(
    #[Autowire(service: 'paragraphs_blokkli.preview_grant_checker')]
    private readonly PreviewGrantChecker $previewGrantChecker,
  ) {}

  /**
   * Implements hook_entity_access().
   */
  #[Hook('entity_access')]
  public function access(EntityInterface $entity, string $operation, AccountInterface $account): AccessResultInterface {
    // Published entities don't vary by the grant.
    if ($operation !== 'view' || !$entity instanceof EntityPublishedInterface || $entity->isPublished()) {
      return AccessResult::neutral();
    }
    return AccessResult::allowedIf($this->previewGrantChecker->isEntityPreviewable($entity))
      ->addCacheContexts(['paragraphs_blokkli_session'])
      ->addCacheableDependency($entity);
  }

}
