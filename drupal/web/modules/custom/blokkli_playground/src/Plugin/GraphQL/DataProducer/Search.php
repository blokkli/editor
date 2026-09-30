<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\GraphQL\DataProducer;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Plugin\Context\ContextDefinition;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\graphql\Attribute\DataProducer;
use Drupal\graphql\GraphQL\Execution\FieldContext;
use Drupal\graphql\Plugin\GraphQL\DataProducer\DataProducerPluginBase;
use Drupal\node\NodeInterface;
use Drupal\search_api\IndexInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Searches the Search API index "content" in one language.
 *
 * Returns the number of results and the nodes of the requested page. The
 * results depend on the index, so its list cache tag invalidates them.
 */
#[DataProducer(
  id: 'blokkli_playground_search',
  name: new TranslatableMarkup('Search the content'),
  produces: new ContextDefinition(
    data_type: 'any',
    label: new TranslatableMarkup('The total and the nodes'),
  ),
  consumes: [
    'text' => new ContextDefinition(
      data_type: 'string',
      label: new TranslatableMarkup('The search text'),
    ),
    'offset' => new ContextDefinition(
      data_type: 'integer',
      label: new TranslatableMarkup('The first result'),
      required: FALSE,
    ),
    'limit' => new ContextDefinition(
      data_type: 'integer',
      label: new TranslatableMarkup('The number of results'),
      required: FALSE,
    ),
    'langcode' => new ContextDefinition(
      data_type: 'string',
      label: new TranslatableMarkup('The language'),
    ),
  ],
)]
final class Search extends DataProducerPluginBase implements ContainerFactoryPluginInterface {

  /**
   * The index searched.
   */
  private const INDEX = 'content';

  /**
   * The most results a page can have.
   */
  private const MAX_LIMIT = 50;

  public function __construct(
    array $configuration,
    string $pluginId,
    mixed $pluginDefinition,
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
      $container->get('entity_type.manager'),
    );
  }

  /**
   * Resolves the search.
   */
  public function resolve(string $text, ?int $offset, ?int $limit, string $langcode, FieldContext $field): array {
    $field->addCacheTags(['search_api_list:' . self::INDEX]);
    $index = $this->entityTypeManager->getStorage('search_api_index')->load(self::INDEX);
    $text = trim($text);
    if (!$index instanceof IndexInterface || $text === '') {
      return ['total' => 0, 'items' => []];
    }
    $field->addCacheableDependency($index);

    $query = $index->query();
    $query->keys($text);
    $query->setLanguages([$langcode]);
    $query->range(max(0, $offset ?? 0), min(self::MAX_LIMIT, max(1, $limit ?? 10)));
    $results = $query->execute();

    $items = [];
    foreach ($results->getResultItems() as $item) {
      $node = $item->getOriginalObject()?->getValue();
      if (!$node instanceof NodeInterface) {
        continue;
      }
      if ($node->hasTranslation($langcode)) {
        $node = $node->getTranslation($langcode);
      }
      $items[] = $node;
    }

    return ['total' => $results->getResultCount(), 'items' => $items];
  }

}
