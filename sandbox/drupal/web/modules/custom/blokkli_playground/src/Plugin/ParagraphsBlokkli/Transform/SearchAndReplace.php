<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\Plugin\ParagraphsBlokkli\Transform;

use Drupal\Component\Uuid\UuidInterface;
use Drupal\Component\Utility\Html;
use Drupal\Core\Entity\FieldableEntityInterface;
use Drupal\Core\Language\LanguageInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\paragraphs_blokkli\Model\PluginConfig\PluginConfigBuilder;
use Drupal\paragraphs_blokkli\ParagraphMutationContextInterface;
use Drupal\paragraphs_blokkli\ParagraphsBlokkliUserInputPluginInterface;
use Drupal\paragraphs_blokkli_transform\Attribute\ParagraphTransform;
use Drupal\paragraphs_blokkli_transform\ParagraphTransformPluginBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Replaces a text in text and title paragraphs, e.g. a renamed office.
 *
 * Only the text is replaced, not the markup: a link's URL stays as it is.
 */
#[ParagraphTransform(
  id: 'search_and_replace',
  title: new TranslatableMarkup('Search and replace'),
  description: new TranslatableMarkup('Replaces a text everywhere in the selected blocks.'),
  bundles: ['text', 'title'],
  allowPreview: TRUE,
)]
final class SearchAndReplace extends ParagraphTransformPluginBase implements ParagraphsBlokkliUserInputPluginInterface {

  use StringTranslationTrait;

  public function __construct(
    array $configuration,
    $plugin_id,
    array $plugin_definition,
    UuidInterface $uuidHelper,
    protected readonly LanguageManagerInterface $languageManager,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition, $uuidHelper);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('uuid'),
      $container->get('language_manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getUserInputConfiguration(PluginConfigBuilder $builder): void {
    // A context, so that the translation doesn't replace core's "Search".
    $options = ['context' => 'blokkli_playground'];
    $builder->addText('search')->label((string) $this->t('Search', [], $options))->required();
    // Empty removes the text.
    $builder->addText('replace')->label((string) $this->t('Replace with', [], $options));
  }

  /**
   * {@inheritdoc}
   *
   * Also in translations, unlike most transforms: it changes the text of the
   * current translation, not the paragraphs' structure.
   */
  public function applies(FieldableEntityInterface $hostEntity, string $langcode): bool {
    return TRUE;
  }

  /**
   * {@inheritdoc}
   */
  public function transform(ParagraphMutationContextInterface $context, array $uuids, array $userConfig): void {
    $search = (string) ($userConfig['search'] ?? '');
    $replace = (string) ($userConfig['replace'] ?? '');
    if ($search === '') {
      return;
    }

    // The editor's language. The transform mutation passes none, but its
    // request has the language's prefix.
    $langcode = $this->languageManager->getCurrentLanguage(LanguageInterface::TYPE_CONTENT)->getId();

    foreach ($uuids as $uuid) {
      $paragraph = $context->getProxy($uuid)?->getParagraph();
      if (!$paragraph) {
        continue;
      }
      if ($paragraph->hasTranslation($langcode)) {
        $paragraph = $paragraph->getTranslation($langcode);
      }

      if ($paragraph->hasField('field_text')) {
        foreach ($paragraph->get('field_text') as $item) {
          $item->set('value', $this->replaceInMarkup((string) $item->get('value')->getValue(), $search, $replace));
        }
      }

      if ($paragraph->hasField('field_title')) {
        foreach ($paragraph->get('field_title') as $item) {
          $item->set('value', str_replace($search, $replace, (string) $item->get('value')->getValue()));
        }
      }
    }
  }

  /**
   * Replaces the text in the markup's text nodes only.
   */
  private function replaceInMarkup(string $markup, string $search, string $replace): string {
    $document = Html::load($markup);
    $textNodes = (new \DOMXPath($document))->query('//text()') ?: [];
    foreach ($textNodes as $node) {
      $node->nodeValue = str_replace($search, $replace, (string) $node->nodeValue);
    }
    return Html::serialize($document);
  }

}
