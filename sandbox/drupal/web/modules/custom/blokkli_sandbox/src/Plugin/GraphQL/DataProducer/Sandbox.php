<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\Plugin\GraphQL\DataProducer;

use Drupal\blokkli_sandbox\LoginToken;
use Drupal\blokkli_sandbox\SandboxManager;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Plugin\Context\ContextDefinition;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\Site\Settings;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\Core\Url;
use Drupal\graphql\Attribute\DataProducer;
use Drupal\graphql\GraphQL\Execution\FieldContext;
use Drupal\graphql\Plugin\GraphQL\DataProducer\DataProducerPluginBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * The current sandbox, for the frontend's banner: its limits and logins.
 *
 * NULL for anonymous visitors, on the default site and in a sandbox that
 * doesn't expire. The logins are every test user's, valid until the sandbox
 * is deleted at the latest: any of its users may hand them out, since they
 * are all the visitor who claimed it, or colleagues they invited.
 */
#[DataProducer(
  id: 'blokkli_sandbox',
  name: new TranslatableMarkup('The current sandbox'),
  produces: new ContextDefinition(
    data_type: 'any',
    label: new TranslatableMarkup('Its limits and logins'),
  ),
)]
final class Sandbox extends DataProducerPluginBase implements ContainerFactoryPluginInterface {

  public function __construct(
    array $configuration,
    string $pluginId,
    mixed $pluginDefinition,
    protected readonly AccountProxyInterface $currentUser,
    protected readonly Settings $settings,
    protected readonly SandboxManager $sandboxManager,
    protected readonly LoginToken $loginToken,
    protected readonly EntityTypeManagerInterface $entityTypeManager,
  ) {
    parent::__construct($configuration, $pluginId, $pluginDefinition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('current_user'),
      $container->get('settings'),
      $container->get(SandboxManager::class),
      $container->get(LoginToken::class),
      $container->get('entity_type.manager'),
    );
  }

  /**
   * Resolves the sandbox.
   */
  public function resolve(FieldContext $field): ?array {
    $field->addCacheContexts(['user']);
    $id = $this->settings->get('blokkli_sandbox')['id'] ?? NULL;
    $lifetime = is_string($id) ? $this->sandboxManager->lifetime($id) : NULL;
    if ($lifetime === NULL || $this->currentUser->isAnonymous()) {
      return NULL;
    }

    // The roles' labels are in the current language.
    $field->addCacheTags(['user_list']);
    $field->addCacheContexts(['languages:language_interface']);
    $userStorage = $this->entityTypeManager->getStorage('user');
    $roleStorage = $this->entityTypeManager->getStorage('user_role');
    // Not the admin (uid 1): only the test users.
    $ids = $userStorage->getQuery()
      ->accessCheck(FALSE)
      ->condition('uid', 1, '>')
      ->condition('status', 1)
      ->sort('uid')
      ->execute();

    $logins = [];
    foreach ($userStorage->loadMultiple($ids) as $account) {
      $token = $this->loginToken->create($account->getAccountName(), $lifetime['expires']);
      if ($token === NULL) {
        continue;
      }
      $url = Url::fromRoute('blokkli_sandbox.login', ['token' => $token], ['absolute' => TRUE])->toString(TRUE);
      $field->addCacheableDependency($url);
      $roles = $account->getRoles(TRUE);
      $role = $roles ? $roleStorage->load(reset($roles)) : NULL;
      if ($role) {
        $field->addCacheableDependency($role);
      }
      $logins[] = [
        'name' => $account->getDisplayName(),
        'role' => (string) $role?->label(),
        'url' => $url->getGeneratedUrl(),
        'isCurrentUser' => (int) $account->id() === (int) $this->currentUser->id(),
      ];
    }

    return [
      'expires' => $lifetime['expires'],
      'idleLifetime' => $lifetime['idle'],
      'logins' => $logins,
    ];
  }

}
