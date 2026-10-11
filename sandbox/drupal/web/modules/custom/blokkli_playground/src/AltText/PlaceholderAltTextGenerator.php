<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\AltText;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\file\FileInterface;
use Drupal\paragraphs_blokkli\AltText\AltTextGeneratorInterface;

/**
 * Gives the editor's upload dialog an alt text to generate: a placeholder.
 *
 * A site's generator asks a service to describe the image, as the one for Rokka
 * in paragraphs_blokkli does. This site has no such service, so the text says
 * what it is: the dialog's button can always be tried. A generator of a real
 * service comes first (its priority is higher).
 */
final class PlaceholderAltTextGenerator implements AltTextGeneratorInterface {

  use StringTranslationTrait;

  /**
   * {@inheritdoc}
   */
  public function applies(FieldDefinitionInterface $sourceField): bool {
    return $sourceField->getType() === 'image';
  }

  /**
   * {@inheritdoc}
   */
  public function generate(FileInterface $file, FieldDefinitionInterface $sourceField, string $langcode): string {
    return (string) $this->t('Placeholder for a description of "@name": this site has no service that describes images.', [
      '@name' => $file->getFilename(),
    ], ['langcode' => $langcode]);
  }

  /**
   * {@inheritdoc}
   */
  public function getDefault(FileInterface $file, FieldDefinitionInterface $sourceField, string $langcode): ?string {
    return NULL;
  }

}
