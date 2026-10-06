<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Drush\Commands;

use Drupal\blokkli_playground\Seed\SeedException;
use Drupal\blokkli_playground\Seed\Seeder;
use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Routing\RouteBuilderInterface;
use Drupal\graphql\Entity\ServerInterface;
use Drupal\node\NodeAccessRebuild;
use Drush\Attributes as CLI;
use Drush\Commands\AutowireTrait;
use Drush\Commands\DrushCommands;
use GraphQL\Server\OperationParams;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Seeds the playground's content and writes the template for sandboxes.
 *
 * `ddev bake` runs both on a freshly installed site.
 */
final class SeedCommands extends DrushCommands {

  use AutowireTrait;

  public function __construct(
    private readonly Seeder $seeder,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly FileSystemInterface $fileSystem,
    private readonly Connection $database,
    private readonly RouteBuilderInterface $routeBuilder,
    private readonly NodeAccessRebuild $nodeAccessRebuild,
    #[Autowire(service: 'cache.render')]
    private readonly CacheBackendInterface $renderCache,
    #[Autowire(service: 'cache.page')]
    private readonly CacheBackendInterface $pageCache,
    #[Autowire(service: 'cache.dynamic_page_cache')]
    private readonly CacheBackendInterface $dynamicPageCache,
  ) {
    parent::__construct();
  }

  /**
   * Creates the content of sandbox/drupal/content, in the source language.
   */
  #[CLI\Command(name: 'blokkli-playground:seed')]
  #[CLI\Option(name: 'source', description: 'The original language of the content (en, de or fr); the others are translations.')]
  #[CLI\Option(name: 'content', description: 'The content directory, if not sandbox/drupal/content.')]
  #[CLI\Usage(name: 'drush blokkli-playground:seed --source=de', description: 'Seed the content with German as its original language.')]
  public function seed(array $options = ['source' => 'en', 'content' => NULL]): void {
    $nodes = $this->entityTypeManager->getStorage('node')->getQuery()->accessCheck(FALSE)->count()->execute();
    if ($nodes) {
      throw new \RuntimeException('The site has content already: seed a freshly installed site.');
    }
    $directory = $options['content'] ?? dirname(\DRUPAL_ROOT) . '/content';
    try {
      $counts = $this->seeder->seed($directory, (string) $options['source']);
    }
    catch (SeedException $e) {
      foreach ($e->messages as $message) {
        $this->logger()->error($message);
      }
      throw new \RuntimeException(count($e->messages) . ' problems in the content, nothing was created.');
    }
    // Installing view_unpublished flags node access for a rebuild. The nodes
    // wrote their grants when they were saved; the rebuild clears the flag.
    $this->nodeAccessRebuild->rebuild();
    $counts = array_filter($counts);
    $this->logger()->success('Seeded in ' . $options['source'] . ': ' . implode(', ', array_map(
      fn (string $type, int $count) => "$count $type",
      array_keys($counts),
      $counts,
    )) . '.');
  }

  /**
   * Prepares the site for copying and writes its database into a directory.
   *
   * Run it after a cache rebuild: it creates the image style derivatives,
   * warms the router and the GraphQL schema, and clears the caches that can
   * hold the site's hostname.
   */
  #[CLI\Command(name: 'blokkli-playground:template')]
  #[CLI\Argument(name: 'directory', description: 'Where to write db.sqlite.')]
  #[CLI\Usage(name: 'drush blokkli-playground:template /var/www/html/sandbox/drupal/sandboxes/_template/en', description: 'Write the English template.')]
  public function template(string $directory): void {
    $styles = $this->entityTypeManager->getStorage('image_style')->loadMultiple();
    $derivatives = 0;
    foreach ($this->entityTypeManager->getStorage('file')->loadMultiple() as $file) {
      if (!str_starts_with((string) $file->getMimeType(), 'image/')) {
        continue;
      }
      $uri = $file->getFileUri();
      foreach ($styles as $style) {
        $derivative = $style->buildUri($uri);
        if ($style->supportsUri($uri) && !file_exists($derivative) && $style->createDerivative($uri, $derivative)) {
          $derivatives++;
        }
      }
    }

    $this->routeBuilder->rebuildIfNeeded();
    $server = $this->entityTypeManager->getStorage('graphql_server')->load('graphql');
    assert($server instanceof ServerInterface);
    $server->executeOperation(OperationParams::create(['query' => '{ __typename }']));

    foreach ([$this->renderCache, $this->pageCache, $this->dynamicPageCache] as $cache) {
      $cache->deleteAll();
    }

    // Through Drupal's connection: it registers the NOCASE_UTF8 collation that
    // the indexes use, which the sqlite3 CLI doesn't know.
    $this->fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY);
    $target = rtrim($directory, '/') . '/db.sqlite';
    if (file_exists($target)) {
      unlink($target);
    }
    $this->database->query('VACUUM INTO :target', [':target' => $target]);
    $this->logger()->success(sprintf('Wrote %s (%.1f MB, %d image style derivatives).', $target, filesize($target) / 1e6, $derivatives));
  }

}
