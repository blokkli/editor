<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Access;

use Drupal\Core\Cache\CacheOptionalInterface;
use Drupal\Core\Session\AccessPolicyBase;
use Drupal\Core\Session\AccountInterface;
use Drupal\Core\Session\CalculatedPermissionsItem;
use Drupal\Core\Session\RefinableCalculatedPermissionsInterface;
use Drupal\Core\Site\Settings;
use Drupal\paragraphs_blokkli\PreviewGrantChecker;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Lets anonymous visitors view the site with a preview grant.
 *
 * Anonymous visitors can't view content: a sandbox is private. "Preview on
 * smartphone" shares a page's pending changes through a link, which stores a
 * grant in the visitor's session. While the grant is valid, the visitor may
 * view the site through GraphQL
 * (plans/drupal-setup/10-access-and-guardrails.md).
 *
 * $settings['blokkli_playground_public'] in settings.local.php lets every
 * anonymous visitor of the dev site view it, so that Nuxt renders its pages
 * on the server. Sandboxes ignore it (settings.php).
 *
 * The grant is the current request's, whatever anonymous account the
 * permissions are calculated for.
 */
final class AnonymousViewerAccessPolicy extends AccessPolicyBase implements CacheOptionalInterface {

  /**
   * Viewing content through GraphQL.
   *
   * The paragraph type permissions still hide unpublished paragraphs.
   */
  private const PERMISSIONS = [
    'access content',
    'execute graphql arbitrary graphql requests',
    'bypass paragraphs type content access',
  ];

  public function __construct(
    private readonly Settings $settings,
    #[Autowire(service: 'paragraphs_blokkli.preview_grant_checker')]
    private readonly PreviewGrantChecker $previewGrantChecker,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function calculatePermissions(AccountInterface $account, string $scope): RefinableCalculatedPermissionsInterface {
    $calculatedPermissions = parent::calculatePermissions($account, $scope);
    if (!$account->isAnonymous()) {
      return $calculatedPermissions;
    }

    if (!$this->settings->get('blokkli_playground_public')) {
      $calculatedPermissions->addCacheContexts(['paragraphs_blokkli_session']);
      if (!$this->previewGrantChecker->hasValidGrant()) {
        return $calculatedPermissions;
      }
    }

    return $calculatedPermissions->addItem(new CalculatedPermissionsItem(self::PERMISSIONS));
  }

  /**
   * {@inheritdoc}
   */
  public function getPersistentCacheContexts(): array {
    return ['user.roles:anonymous'];
  }

}
