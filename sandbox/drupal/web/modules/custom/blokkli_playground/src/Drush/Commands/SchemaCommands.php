<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Drush\Commands;

use Drupal\blokkli_playground\Config\SourceLanguageOverride;
use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\graphql\Entity\Server;
use Drush\Attributes as CLI;
use Drush\Commands\AutowireTrait;
use Drush\Commands\DrushCommands;
use GraphQL\Utils\SchemaPrinter;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Dumps the GraphQL schema, the same whatever the dev site was baked in.
 *
 * `bun run drupal:schema` runs it.
 */
final class SchemaCommands extends DrushCommands {

  use AutowireTrait;

  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly LanguageManagerInterface $languageManager,
    private readonly SourceLanguageOverride $sourceLanguageOverride,
    #[Autowire(service: 'cache.graphql.ast')]
    private readonly CacheBackendInterface $astCache,
  ) {
    parent::__construct();
  }

  /**
   * Writes the schema of the server "graphql" to a file.
   *
   * The languages are in the config's order, and the texts in the default
   * language, English, as on a site baked in English. The schema is built
   * anew: the cached one may come from a request that lists the content's
   * original language first.
   */
  #[CLI\Command(name: 'blokkli-playground:schema')]
  #[CLI\Argument(name: 'file', description: 'Where to write the schema.')]
  #[CLI\Usage(name: 'drush blokkli-playground:schema /var/www/html/build/drupal-schema.graphql', description: 'Write the schema that the editor is built with.')]
  public function schema(string $file): void {
    $this->sourceLanguageOverride->disable();
    $this->configFactory->reset();
    $this->languageManager->reset();
    $this->astCache->deleteAll();

    $server = $this->entityTypeManager->getStorage('graphql_server')->load('graphql');
    assert($server instanceof Server);
    $schema = $server->configuration()->getSchema();
    if ($schema === NULL) {
      throw new \RuntimeException('The GraphQL server has no schema.');
    }

    file_put_contents($file, SchemaPrinter::doPrint($schema));
    $this->logger()->success("Wrote $file.");
  }

}
