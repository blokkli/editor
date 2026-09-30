<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Seed;

use Drupal\Component\Serialization\Exception\InvalidDataTypeException;
use Drupal\Component\Serialization\Yaml;
use Drupal\Component\Utility\Html;
use Drupal\content_translation\ContentTranslationManagerInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityTypeBundleInfoInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\File\FileExists;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\Session\AccountSwitcherInterface;
use Drupal\Core\State\StateInterface;
use Drupal\datetime\Plugin\Field\FieldType\DateTimeItemInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\pathauto\PathautoGeneratorInterface;
use Drupal\user\UserInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Creates the site's content from the files in drupal/content.
 *
 * The format is described in drupal/content/README.md. Every file is read and
 * checked first: nothing is created while a file has problems.
 */
final class Seeder {

  /**
   * The namespace of the seeded entities' version 5 UUIDs.
   */
  private const UUID_NAMESPACE = 'b10c4e1f-5eed-4c0d-9a1e-3b7c2f6d8e90';

  /**
   * The content files by entity type, in the order they're created.
   */
  private const FILES = [
    'user' => 'users.yml',
    'media' => 'media.yml',
    'taxonomy_term' => 'terms.yml',
    'paragraphs_library_item' => 'library.yml',
    'node' => 'nodes',
    'blokkli_paragraph_template' => 'templates.yml',
    'translatable_config_pages' => 'config_pages.yml',
    'menu_link_content' => 'menu.yml',
  ];

  /**
   * The keys of an entity in the files that aren't fields.
   */
  private const RESERVED = ['key', 'type', 'id', 'source', 'options', 'outdated', 'frontend_route'];

  /**
   * How the files refer to other entities, e.g. `{ node: town-hall }`.
   */
  private const REFERENCES = [
    'node' => 'node',
    'media' => 'media',
    'term' => 'taxonomy_term',
    'library' => 'paragraphs_library_item',
    'user' => 'user',
  ];

  /**
   * The content directory.
   */
  private string $directory;

  /**
   * The original language of the seeded content.
   */
  private string $source;

  /**
   * The site's langcodes, in the site's order.
   */
  private array $languages;

  /**
   * The site's timezone, for relative dates.
   */
  private \DateTimeZone $timezone;

  /**
   * The problems found, as keys: the same one is reported once.
   */
  private array $errors = [];

  /**
   * The keys in the files: [entity type][key] => TRUE.
   */
  private array $keys = [];

  /**
   * The IDs of created entities, and the nodes' in advance: [entity type][key].
   */
  private array $ids = [];

  /**
   * The references to check once every file is read: [Ref, path].
   */
  private array $refs = [];

  /**
   * The key of the node being read.
   */
  private ?string $node = NULL;

  /**
   * The nodes each node references: [key => keys].
   */
  private array $dependencies = [];

  /**
   * The files to create: [path in files/ => directory URI].
   */
  private array $files = [];

  /**
   * The nodes of the frontend routes: [route name => node key].
   */
  private array $frontendRoutes = [];

  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly EntityFieldManagerInterface $entityFieldManager,
    private readonly EntityTypeBundleInfoInterface $bundleInfo,
    private readonly LanguageManagerInterface $languageManager,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly FileSystemInterface $fileSystem,
    private readonly Connection $database,
    private readonly AccountSwitcherInterface $accountSwitcher,
    private readonly StateInterface $state,
    #[Autowire(service: 'content_translation.manager')]
    private readonly ContentTranslationManagerInterface $contentTranslationManager,
    #[Autowire(service: 'pathauto.generator')]
    private readonly PathautoGeneratorInterface $pathautoGenerator,
  ) {}

  /**
   * Seeds the content of a directory with the given original language.
   *
   * @return int[]
   *   The number of created entities by entity type.
   *
   * @throws \Drupal\blokkli_playground\Seed\SeedException
   */
  public function seed(string $directory, string $source): array {
    $this->directory = rtrim($directory, '/');
    $this->source = $source;
    $this->languages = array_keys($this->languageManager->getLanguages());
    $this->timezone = new \DateTimeZone($this->configFactory->get('system.date')->get('timezone.default') ?: 'UTC');
    if (!in_array($source, $this->languages, TRUE)) {
      throw new SeedException(["The source language '$source' isn't a language of the site (" . implode(', ', $this->languages) . ').']);
    }
    // The admin comes from the installation.
    $this->keys['user']['admin'] = TRUE;
    $this->ids['user']['admin'] = 1;

    $items = [];
    foreach (self::FILES as $entityType => $file) {
      $items[$entityType] = [];
      foreach ($this->read($entityType, $file) as [$path, $data]) {
        $this->node = $entityType === 'node' && is_array($data) ? (string) ($data['key'] ?? '') : NULL;
        $item = $this->prepare($entityType, $data, $path);
        if ($item) {
          $items[$entityType][] = $item;
        }
      }
    }
    $this->node = NULL;
    $comments = $this->prepareComments();
    $texts = $this->readTexts();
    foreach ($this->refs as [$ref, $path]) {
      if (!isset($this->keys[$ref->entityType][$ref->key])) {
        $this->error("$path: there's no $ref->entityType '$ref->key'");
      }
    }
    $this->reserveNodeIds($items['node']);
    $items['node'] = $this->sortNodes($items['node']);
    if ($this->errors) {
      throw new SeedException(array_keys($this->errors));
    }

    $admin = $this->entityTypeManager->getStorage('user')->load(1);
    assert($admin instanceof UserInterface);
    $this->accountSwitcher->switchTo($admin);
    $transaction = $this->database->startTransaction();
    try {
      $this->createFiles();
      foreach ($items as $entityType => $list) {
        foreach ($list as $item) {
          $entity = $this->build($item);
          $entity->save();
          $this->ids[$entityType][$item->key] = (int) $entity->id();
        }
      }
      // Pages get their URL from the menu, which exists only now.
      $this->updateAliases($items['node']);
      $this->assignFrontendRoutes();
      $this->createComments($comments);
      $this->createTexts($texts);
    }
    catch (\Throwable $e) {
      $transaction->rollBack();
      throw $e;
    }
    finally {
      $this->accountSwitcher->switchBack();
    }
    unset($transaction);

    return array_map('count', $items) + [
      'file' => count($this->files),
      'blokkli_comment' => array_sum(array_map(fn (array $thread) => 1 + count($thread['replies'] ?? []), $comments)),
      'texts' => count($texts),
    ];
  }

  /**
   * Reads the entities of a content file (or of the nodes' folder).
   *
   * @return array
   *   A list of [path for messages, data].
   */
  private function read(string $entityType, string $file): array {
    $path = "$this->directory/$file";
    if ($entityType === 'node') {
      $files = glob("$path/*.yml") ?: [];
      sort($files);
      return array_map(fn (string $file) => [substr($file, strlen($this->directory) + 1), $this->decode($file)], $files);
    }
    if (!is_file($path)) {
      return [];
    }
    $data = $this->decode($path);
    if ($entityType === 'menu_link_content') {
      return is_array($data) ? $this->flattenMenus($data, $file) : [];
    }
    if (!is_array($data) || !array_is_list($data)) {
      $this->error("$file: expected a list");
      return [];
    }
    return array_map(fn (mixed $entry) => ["$file#" . (is_array($entry) ? ($entry['key'] ?? '?') : '?'), $entry], $data);
  }

  /**
   * Turns the menu trees into menu links, each with its parent and weight.
   */
  private function flattenMenus(array $menus, string $file): array {
    $entries = [];
    $walk = function (array $links, string $menu, ?string $parent) use (&$walk, &$entries, $file): void {
      foreach (array_values($links) as $weight => $link) {
        if (!is_array($link)) {
          $this->error("$file: expected a menu link, not " . json_encode($link));
          continue;
        }
        $children = $link['children'] ?? [];
        unset($link['children']);
        $entries[] = ["$file#" . ($link['key'] ?? '?'), $link + [
          'menu_name' => $menu,
          'weight' => $weight,
          'parent' => $parent === NULL ? '' : 'menu_link_content:' . $this->uuid("menu_link_content:$parent"),
        ],
        ];
        if (is_array($children) && isset($link['key'])) {
          $walk($children, $menu, $link['key']);
        }
      }
    };
    foreach ($menus as $menu => $links) {
      $walk(is_array($links) ? $links : [], (string) $menu, NULL);
    }
    return $entries;
  }

  /**
   * Parses a YAML file.
   */
  private function decode(string $file): mixed {
    try {
      return Yaml::decode((string) file_get_contents($file));
    }
    catch (InvalidDataTypeException $e) {
      $this->error(substr($file, strlen($this->directory) + 1) . ': ' . $e->getMessage());
      return NULL;
    }
  }

  /**
   * Checks an entity or a paragraph and converts its values per language.
   *
   * @param string $entityType
   *   The entity type.
   * @param mixed $data
   *   The entity from the file.
   * @param string $path
   *   Where it is, for messages.
   * @param string $uuidName
   *   For paragraphs: the name of their UUID, if they have no key.
   * @param array|null $host
   *   For paragraphs: the host's source language, whether it's translatable,
   *   and its outdated languages.
   */
  private function prepare(string $entityType, mixed $data, string $path, string $uuidName = '', ?array $host = NULL): ?Item {
    if (!is_array($data) || array_is_list($data)) {
      $this->error("$path: expected an entity with a key and fields");
      return NULL;
    }
    $bundles = $this->bundleInfo->getBundleInfo($entityType);
    $bundle = (string) ($data['type'] ?? $entityType);
    if (!isset($bundles[$bundle])) {
      $this->error("$path: there's no $entityType type '$bundle'");
      return NULL;
    }

    $key = isset($data['key']) ? (string) $data['key'] : NULL;
    $keyType = $host === NULL ? $entityType : 'paragraph';
    if ($key !== NULL) {
      if (isset($this->keys[$keyType][$key])) {
        $this->error("$path: the key '$key' is used twice");
      }
      $this->keys[$keyType][$key] = TRUE;
      $uuidName = "$keyType:$key";
    }
    elseif ($host === NULL) {
      $this->error("$path: every entity needs a key");
      return NULL;
    }

    if ($host !== NULL && isset($data['source'])) {
      $this->error("$path: a paragraph has its host's source language");
    }
    $source = $host['source'] ?? (string) ($data['source'] ?? $this->source);
    if (!in_array($source, $this->languages, TRUE)) {
      $this->error("$path: there's no language '$source'");
      return NULL;
    }
    $translatable = !empty($bundles[$bundle]['translatable']) && ($host['translatable'] ?? TRUE);
    $outdated = $host['outdated'] ?? (array) ($data['outdated'] ?? []);
    $paragraphHost = [
      'source' => $source,
      'translatable' => $host['translatable'] ?? !empty($bundles[$bundle]['translatable']),
      'outdated' => $outdated,
    ];

    if (isset($data['id'])) {
      if ($entityType !== 'node' || !is_int($data['id']) || $data['id'] < 1) {
        $this->error("$path: only nodes can have an id, and it's a number");
      }
      elseif (in_array($data['id'], $this->ids['node'] ?? [], TRUE)) {
        $this->error("$path: the id {$data['id']} is used twice");
      }
      else {
        $this->ids['node'][$key] = $data['id'];
      }
    }

    if (isset($data['frontend_route'])) {
      $name = $data['frontend_route'];
      $routes = $this->configFactory->get('frontend_routing.settings')->get('keys') ?? [];
      if ($entityType !== 'node' || !is_string($name) || !isset($routes[$name])) {
        $this->error("$path: there's no frontend route '" . (is_string($name) ? $name : '') . "' in frontend_routing.settings");
      }
      elseif (isset($this->frontendRoutes[$name])) {
        $this->error("$path: the frontend route '$name' has two nodes");
      }
      else {
        $this->frontendRoutes[$name] = $key;
      }
    }

    $definitions = $this->entityFieldManager->getFieldDefinitions($entityType, $bundle);
    $languages = [$source];
    $fields = [];
    $paragraphs = [];
    foreach (array_diff_key($data, array_flip(self::RESERVED)) as $name => $value) {
      $at = $this->at($path, (string) $name);
      $definition = $definitions[$name] ?? NULL;
      if (!$definition) {
        $this->error("$at: there's no such field on $entityType type '$bundle'");
        continue;
      }
      if ($definition->getType() === 'entity_reference_revisions') {
        if (!is_array($value) || !array_is_list($value)) {
          $this->error("$at: expected a list of paragraphs");
          continue;
        }
        $paragraphs[$name] = [];
        foreach ($value as $delta => $paragraph) {
          $item = $this->prepare('paragraph', $paragraph, "$at.$delta", "$uuidName/$name/$delta", $paragraphHost);
          if ($item) {
            $paragraphs[$name][] = $item;
            $languages = [...$languages, ...$item->languages];
          }
        }
        continue;
      }
      $found = $this->findLanguages($value, $source, $at);
      if ($found && !$definition->isTranslatable()) {
        $this->error("$at: the field isn't translatable, so it has one value for all languages");
      }
      $languages = [...$languages, ...$found];
      $fields[$name] = $value;
    }

    // The site's languages that appear, in the site's order.
    $languages = array_values(array_intersect($this->languages, $languages));
    $translations = $translatable ? array_values(array_diff($languages, [$source])) : [];
    $values = [$source => $paragraphs];
    foreach ([$source, ...$translations] as $langcode) {
      foreach ($fields as $name => $value) {
        if ($langcode === $source || $definitions[$name]->isTranslatable()) {
          $values[$langcode][$name] = $this->convert($definitions[$name], $this->pick($value, $langcode, $source), $this->at($path, (string) $name));
        }
      }
    }

    $options = [];
    if (isset($data['options'])) {
      if ($entityType !== 'paragraph' || !is_array($data['options'])) {
        $this->error("$path: only paragraphs have options, as a map");
      }
      else {
        $options = $this->options($bundle, $data['options'], $source, $this->at($path, 'options'));
      }
    }

    return new Item(
      entityType: $entityType,
      bundle: $bundle,
      key: $key,
      uuid: $this->uuid($uuidName),
      source: $source,
      languages: $languages,
      translations: $translations,
      values: $values,
      options: $options,
      outdated: array_values(array_intersect($outdated, $translations)),
      path: $path,
    );
  }

  /**
   * The languages of the language maps in a value.
   *
   * A language map has only langcodes as keys: `{ en: …, de: …, fr: … }`.
   */
  private function findLanguages(mixed $value, string $source, string $at): array {
    if (!is_array($value)) {
      return [];
    }
    $found = [];
    if ($this->isLanguageMap($value)) {
      if (!array_key_exists($source, $value)) {
        $this->error("$at: there's no value in the source language ($source)");
      }
      $found = array_keys($value);
    }
    foreach ($value as $key => $child) {
      $found = [...$found, ...$this->findLanguages($child, $source, "$at.$key")];
    }
    return $found;
  }

  /**
   * Whether a value is a language map.
   */
  private function isLanguageMap(mixed $value): bool {
    return is_array($value) && $value && !array_is_list($value)
      && !array_diff(array_map('strval', array_keys($value)), $this->languages);
  }

  /**
   * A value in one language: the language maps replaced by their value.
   *
   * A language that a map doesn't have gets the source language's value.
   */
  private function pick(mixed $value, string $langcode, string $source): mixed {
    if (!is_array($value)) {
      return $value;
    }
    if ($this->isLanguageMap($value)) {
      return $this->pick($value[$langcode] ?? $value[$source] ?? NULL, $langcode, $source);
    }
    return array_map(fn (mixed $child) => $this->pick($child, $langcode, $source), $value);
  }

  /**
   * Converts a field's value from the files into field items.
   */
  private function convert(FieldDefinitionInterface $definition, mixed $value, string $at): array {
    $items = is_array($value) && array_is_list($value) ? $value : [$value];
    $converted = [];
    foreach ($items as $delta => $item) {
      $converted[] = $this->convertItem($definition, $item, count($items) > 1 ? "$at.$delta" : $at);
    }
    return $converted;
  }

  /**
   * Converts a field item from the files, by the field's type.
   */
  private function convertItem(FieldDefinitionInterface $definition, mixed $item, string $at): mixed {
    switch ($definition->getType()) {
      case 'entity_reference':
        return $this->isReference($item) ? ['target_id' => $this->reference($item, $definition->getSetting('target_type'), $at)] : $item;

      case 'link':
        $item = is_array($item) && isset($item['uri']) ? $item : ['uri' => $item];
        if ($this->isReference($item['uri'])) {
          $item['uri'] = $this->reference($item['uri'], NULL, $at, TRUE);
        }
        elseif (is_string($item['uri']) && str_starts_with($item['uri'], '/')) {
          $item['uri'] = 'internal:' . $item['uri'];
        }
        return $item;

      case 'text':
      case 'text_long':
      case 'text_with_summary':
        $item = is_array($item) ? $item : ['value' => $item];
        $formats = $definition->getSetting('allowed_formats') ?: ['basic_html'];
        return $item + ['format' => reset($formats)];

      case 'datetime':
      case 'daterange':
        $item = is_array($item) ? $item : ['value' => $item];
        $dateOnly = $definition->getSetting('datetime_type') === 'date';
        foreach (['value', 'end_value'] as $property) {
          if (isset($item[$property])) {
            $date = $this->date((string) $item[$property], $at);
            $item[$property] = $dateOnly
              ? $date?->format(DateTimeItemInterface::DATE_STORAGE_FORMAT)
              : $date?->setTimezone(new \DateTimeZone(DateTimeItemInterface::STORAGE_TIMEZONE))->format(DateTimeItemInterface::DATETIME_STORAGE_FORMAT);
          }
        }
        return $item;

      case 'created':
      case 'changed':
      case 'timestamp':
        return is_string($item) ? $this->date($item, $at)?->getTimestamp() : $item;

      case 'file':
      case 'image':
        if (is_array($item) && isset($item['file'])) {
          $file = (string) $item['file'];
          unset($item['file']);
          if (!is_file("$this->directory/files/$file")) {
            $this->error("$at: there's no file files/$file");
            return $item;
          }
          $this->files[$file] = $definition->getSetting('uri_scheme') . '://' . $definition->getSetting('file_directory');
          $item['target_id'] = new Ref('file', $file);
        }
        return $item;
    }
    return $item;
  }

  /**
   * Whether a value refers to an entity, e.g. `{ node: town-hall }`.
   */
  private function isReference(mixed $value): bool {
    return is_array($value) && count($value) === 1
      && is_string(array_key_first($value)) && isset(self::REFERENCES[array_key_first($value)])
      && is_scalar(reset($value));
  }

  /**
   * A reference to an entity, checked once every file is read.
   */
  private function reference(array $value, ?string $targetType, string $at, bool $asUri = FALSE): ?Ref {
    $name = (string) array_key_first($value);
    $entityType = self::REFERENCES[$name];
    if ($targetType !== NULL && $entityType !== $targetType) {
      $this->error("$at: expected a reference to a $targetType, not { $name: … }");
      return NULL;
    }
    $ref = new Ref($entityType, (string) reset($value), $asUri);
    $this->refs[] = [$ref, $at];
    // A link can point to a node that doesn't exist yet, a reference can't.
    if ($entityType === 'node' && $this->node !== NULL && !$asUri) {
      $this->dependencies[$this->node][] = $ref->key;
    }
    return $ref;
  }

  /**
   * A date, absolute or relative (`+12 days 19:30`), in the site's timezone.
   */
  private function date(string $value, string $at): ?\DateTimeImmutable {
    try {
      return new \DateTimeImmutable($value, $this->timezone);
    }
    catch (\Exception) {
      $this->error("$at: '$value' isn't a date");
      return NULL;
    }
  }

  /**
   * Converts a paragraph's options: blökkli stores them as strings.
   */
  private function options(string $bundle, array $options, string $source, string $at): array {
    foreach ($options as $name => $value) {
      if ($bundle === 'chart' && $name === 'data' && is_array($value)) {
        $value = $this->chartData($value, $source, "$at.data");
      }
      $options[$name] = match (TRUE) {
        is_array($value) => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        is_bool($value) => $value ? '1' : '0',
        default => (string) $value,
      };
    }
    return $options;
  }

  /**
   * Moves a chart's texts in the source language into its base texts.
   *
   * A chart keeps its texts in its host's source language, with a translation
   * per other language (ChartTranslation in src/modules/charts). The files give
   * every language in `translations`.
   */
  private function chartData(array $data, string $source, string $at): array {
    $texts = $data['translations'][$source] ?? NULL;
    if (!is_array($texts)) {
      $this->error("$at.translations: there are no texts in the source language ($source)");
      return $data;
    }
    unset($data['translations'][$source]);
    foreach (['title', 'valueAxisTitle', 'categoryAxisTitle', 'categories', 'footnotes'] as $property) {
      if (isset($texts[$property])) {
        $data[$property] = $texts[$property];
      }
    }
    foreach ($texts['seriesNames'] ?? [] as $index => $name) {
      if (isset($data['series'][$index])) {
        $data['series'][$index]['name'] = $name;
      }
    }
    foreach (['prefix', 'suffix'] as $property) {
      if (isset($texts[$property])) {
        $data['numberFormat'][$property] = $texts[$property];
      }
    }
    return $data;
  }

  /**
   * Checks the comment threads: `comments.yml`, see the README.
   */
  private function prepareComments(): array {
    $file = 'comments.yml';
    if (!is_file("$this->directory/$file")) {
      return [];
    }
    $threads = $this->decode("$this->directory/$file");
    if (!is_array($threads) || !array_is_list($threads)) {
      $this->error("$file: expected a list");
      return [];
    }
    foreach ($threads as $thread) {
      $path = "$file#" . ($thread['key'] ?? '?');
      if (!$this->isReference($thread['host'] ?? NULL)) {
        $this->error("$path: host: expected a reference, e.g. { node: home }");
      }
      else {
        $this->reference($thread['host'], NULL, "$path: host");
      }
      foreach ($thread['paragraphs'] ?? [] as $paragraph) {
        if (!isset($this->keys['paragraph'][$paragraph])) {
          $this->error("$path: paragraphs: there's no paragraph with the key '$paragraph'");
        }
      }
      foreach ([$thread, ...($thread['replies'] ?? [])] as $comment) {
        $at = "$file#" . ($comment['key'] ?? '?');
        if (!isset($comment['key'], $comment['body']) || isset($this->keys['blokkli_comment'][$comment['key']])) {
          $this->error("$at: every comment needs a unique key and a body");
          continue;
        }
        $this->keys['blokkli_comment'][$comment['key']] = TRUE;
        $this->reference(['user' => $comment['uid']['user'] ?? ''], 'user', "$at: uid");
        preg_match_all('/@\{([\w-]+)\}/', (string) $comment['body'], $mentions);
        foreach ($mentions[1] as $user) {
          $this->reference(['user' => $user], 'user', "$at: body");
        }
      }
    }
    return $threads;
  }

  /**
   * Reads the UI texts: `texts.csv`, in the format of the texts module.
   */
  private function readTexts(): array {
    $file = "$this->directory/texts.csv";
    if (!is_file($file)) {
      return [];
    }
    $handle = fopen($file, 'r');
    $header = fgetcsv($handle, NULL, ';', '"', '');
    $rows = [];
    while (($row = fgetcsv($handle, NULL, ';', '"', '')) !== FALSE) {
      if (count($row) !== count($header)) {
        $this->error('texts.csv: expected ' . count($header) . ' columns: ' . implode(';', $row));
        continue;
      }
      $row = array_combine($header, $row);
      if ($row['type'] !== 'default' || !str_contains($row['full_key'], '.')) {
        $this->error("texts.csv: {$row['full_key']}: only texts of the type 'default', with a context");
        continue;
      }
      $rows[] = $row;
    }
    fclose($handle);
    return $rows;
  }

  /**
   * Gives the nodes without an id the next free ones, in the files' order.
   */
  private function reserveNodeIds(array $nodes): void {
    $taken = array_values($this->ids['node'] ?? []);
    $next = 1;
    foreach ($nodes as $item) {
      if (!isset($this->ids['node'][$item->key])) {
        while (in_array($next, $taken, TRUE)) {
          $next++;
        }
        $this->ids['node'][$item->key] = $taken[] = $next;
      }
    }
    $front = (string) $this->configFactory->get('system.site')->get('page.front');
    if (preg_match('#^/node/(\d+)$#', $front, $match) && !in_array((int) $match[1], $taken, TRUE)) {
      $this->error("The front page is $front (system.site): give the home page `id: $match[1]`");
    }
  }

  /**
   * Sorts the nodes so that the nodes they reference are created first.
   */
  private function sortNodes(array $nodes): array {
    $byKey = [];
    foreach ($nodes as $item) {
      $byKey[$item->key] = $item;
    }
    $sorted = [];
    $state = [];
    $visit = function (Item $item) use (&$visit, &$sorted, &$state, $byKey): void {
      if (($state[$item->key] ?? '') === 'done') {
        return;
      }
      if (($state[$item->key] ?? '') === 'visiting') {
        $this->error("$item->path: the nodes reference each other in a circle");
        return;
      }
      $state[$item->key] = 'visiting';
      foreach ($this->dependencies[$item->key] ?? [] as $key) {
        if ($key !== $item->key && isset($byKey[$key])) {
          $visit($byKey[$key]);
        }
      }
      $state[$item->key] = 'done';
      $sorted[] = $item;
    };
    array_walk($nodes, $visit);
    return $sorted;
  }

  /**
   * Copies the files the entities use to the fields' directories.
   */
  private function createFiles(): void {
    $storage = $this->entityTypeManager->getStorage('file');
    foreach ($this->files as $file => $directory) {
      $this->fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS);
      $uri = $this->fileSystem->copy("$this->directory/files/$file", "$directory/" . basename($file), FileExists::Replace);
      $entity = $storage->create(['uri' => $uri, 'uuid' => $this->uuid("file:$file"), 'status' => 1]);
      $entity->save();
      $this->ids['file'][$file] = (int) $entity->id();
    }
  }

  /**
   * Creates an entity with its translations, and its paragraphs unsaved.
   */
  private function build(Item $item): ContentEntityInterface {
    $definition = $this->entityTypeManager->getDefinition($item->entityType);
    $values = $this->resolve($item->values[$item->source]) + [
      $definition->getKey('uuid') => $item->uuid,
      $definition->getKey('langcode') => $item->source,
    ];
    if ($definition->hasKey('bundle')) {
      $values[$definition->getKey('bundle')] = $item->bundle;
    }
    if ($item->entityType === 'node') {
      $values['nid'] = $this->ids['node'][$item->key];
    }
    $entity = $this->entityTypeManager->getStorage($item->entityType)->create($values);
    assert($entity instanceof ContentEntityInterface);
    if ($item->options && $entity instanceof ParagraphInterface) {
      $entity->setBehaviorSettings('paragraphs_blokkli_data', $item->options);
    }

    $metadata = $this->contentTranslationManager->isEnabled($item->entityType, $item->bundle);
    foreach ($item->translations as $langcode) {
      $translation = $entity->addTranslation($langcode, $this->resolve($item->values[$langcode] ?? []));
      if ($metadata) {
        $this->contentTranslationManager->getTranslationMetadata($translation)->setSource($item->source);
        $this->contentTranslationManager->getTranslationMetadata($translation)->setOutdated(in_array($langcode, $item->outdated, TRUE));
      }
    }

    $problems = [];
    foreach ([$item->source, ...$item->translations] as $langcode) {
      foreach ($entity->getTranslation($langcode)->validate() as $violation) {
        $problems[] = "$item->path ($langcode): " . $violation->getPropertyPath() . ': ' . strip_tags((string) $violation->getMessage());
      }
    }
    if ($problems) {
      throw new SeedException($problems);
    }
    return $entity;
  }

  /**
   * Replaces the references by IDs and the paragraphs by entities.
   */
  private function resolve(array $values): array {
    foreach ($values as $name => $value) {
      $values[$name] = match (TRUE) {
        $value instanceof Ref => $value->asUri
          ? "entity:$value->entityType/" . $this->ids[$value->entityType][$value->key]
          : $this->ids[$value->entityType][$value->key],
        $value instanceof Item => $this->build($value),
        is_array($value) => $this->resolve($value),
        default => $value,
      };
    }
    return $values;
  }

  /**
   * Updates the nodes' aliases in every language.
   */
  private function updateAliases(array $nodes): void {
    $storage = $this->entityTypeManager->getStorage('node');
    foreach ($nodes as $item) {
      $node = $storage->load($this->ids['node'][$item->key]);
      assert($node instanceof ContentEntityInterface);
      foreach (array_keys($node->getTranslationLanguages()) as $langcode) {
        $this->pathautoGenerator->updateEntityAlias($node->getTranslation($langcode), 'update');
      }
    }
  }

  /**
   * Assigns the nodes of the frontend routes, as frontend_routing's form does.
   *
   * The module has no API for it. The state maps each route to its node. The
   * node's aliases are the route's paths from the config (written by the Nuxt
   * app), in the languages it has; the module keeps pathauto off for it from
   * now on.
   */
  private function assignFrontendRoutes(): void {
    $routes = $this->configFactory->get('frontend_routing.settings')->get('keys') ?? [];
    $nodes = $this->entityTypeManager->getStorage('node');
    $aliases = $this->entityTypeManager->getStorage('path_alias');
    $assigned = [];
    foreach ($this->frontendRoutes as $name => $key) {
      $nid = $this->ids['node'][$key];
      $assigned[$name] = $nid;
      $node = $nodes->load($nid);
      assert($node instanceof ContentEntityInterface);
      $aliases->delete($aliases->loadByProperties(['path' => "/node/$nid"]));
      foreach ($routes[$name]['aliases'] ?? [] as $langcode => $alias) {
        if ($node->hasTranslation($langcode)) {
          $aliases->create([
            'path' => "/node/$nid",
            'alias' => $alias,
            'langcode' => $langcode,
          ])->save();
        }
      }
    }
    $this->state->set('frontend_routing.settings', $assigned);
  }

  /**
   * Creates the comment threads. The module notifies the mentioned users.
   */
  private function createComments(array $threads): void {
    $storage = $this->entityTypeManager->getStorage('blokkli_comment');
    $users = $this->entityTypeManager->getStorage('user');
    foreach ($threads as $thread) {
      $hostType = self::REFERENCES[array_key_first($thread['host'])];
      $parent = NULL;
      foreach ([$thread, ...($thread['replies'] ?? [])] as $comment) {
        $mentions = [];
        $body = preg_replace_callback('/@\{([\w-]+)\}/', function (array $match) use (&$mentions, $users): string {
          $uid = $this->ids['user'][$match[1]];
          $mentions[] = $uid;
          $name = Html::escape((string) $users->load($uid)?->label());
          return "<span class=\"bk-richtext-mention\" data-type=\"mention\" data-id=\"$uid\" data-label=\"$name\" data-mention-suggestion-char=\"@\">@$name</span>";
        }, (string) $comment['body']);
        $entity = $storage->create([
          'uuid' => $this->uuid('blokkli_comment:' . $comment['key']),
          'host_entity_type' => $hostType,
          'host_entity_uuid' => $this->uuid($hostType . ':' . reset($thread['host'])),
          'block_uuids' => $parent === NULL ? array_map(fn (string $key) => $this->uuid("paragraph:$key"), $thread['paragraphs'] ?? []) : [],
          'uid' => $this->ids['user'][$comment['uid']['user']],
          'body' => ['value' => $body, 'format' => 'blokkli_comment'],
          'mentions' => $mentions,
          'resolved' => !empty($comment['resolved']),
          'pid' => $parent,
        ]);
        $entity->save();
        $parent ??= $entity->id();
      }
    }
  }

  /**
   * Creates the UI texts, based on the site's default language.
   *
   * Not validated: the context field only allows contexts that exist already,
   * and the texts module skips that check for new keys too.
   */
  private function createTexts(array $rows): void {
    $storage = $this->entityTypeManager->getStorage('texts');
    $default = $this->languageManager->getDefaultLanguage()->getId();
    foreach ($rows as $row) {
      [$context, $key] = explode('.', $row['full_key'], 2);
      $text = $storage->create([
        'key' => $key,
        'context' => $context,
        'translation' => $row[$default],
        'langcode' => $default,
      ]);
      assert($text instanceof ContentEntityInterface);
      foreach ($this->languages as $langcode) {
        if ($langcode !== $default && ($row[$langcode] ?? '') !== '') {
          $text->addTranslation($langcode, ['translation' => $row[$langcode]]);
        }
      }
      $text->save();
    }
  }

  /**
   * A version 5 UUID: every bake gives an entity the same one.
   */
  private function uuid(string $name): string {
    $hash = sha1(hex2bin(str_replace('-', '', self::UUID_NAMESPACE)) . $name);
    return sprintf(
      '%s-%s-5%s-%02x%s-%s',
      substr($hash, 0, 8),
      substr($hash, 8, 4),
      substr($hash, 13, 3),
      hexdec(substr($hash, 16, 2)) & 0x3f | 0x80,
      substr($hash, 18, 2),
      substr($hash, 20, 12),
    );
  }

  /**
   * The path of a field, for messages: `nodes/home.yml: title`.
   */
  private function at(string $path, string $field): string {
    return str_contains($path, ': ') ? "$path.$field" : "$path: $field";
  }

  /**
   * Records a problem in the files.
   */
  private function error(string $message): void {
    $this->errors[$message] = TRUE;
  }

}
