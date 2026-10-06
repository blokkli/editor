<?php

declare(strict_types=1);

namespace Drupal\blokkli_sandbox\EventSubscriber;

use Drupal\Core\Database\Connection;
use Drupal\Core\Site\Settings;
use Drupal\Core\StringTranslation\ByteSizeMarkup;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\file\Validation\FileValidationEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Validator\ConstraintViolation;

/**
 * Limits how much a sandbox's users can upload, together.
 *
 * Counts the files of the sandbox's users. The template's files have no owner
 * or belong to user 1, the seeder. Applies to every new file that core
 * validates: uploads in Drupal's forms, and blökkli's paste and drop.
 */
final class UploadQuotaSubscriber implements EventSubscriberInterface {

  use StringTranslationTrait;

  public function __construct(
    private readonly Settings $settings,
    private readonly Connection $database,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [FileValidationEvent::class => 'validate'];
  }

  /**
   * Refuses a new file that would exceed the quota, in a sandbox.
   *
   * Stored files are validated again whenever an entity referencing them is,
   * and must not count twice.
   */
  public function validate(FileValidationEvent $event): void {
    $settings = $this->settings->get('blokkli_sandbox');
    if (!isset($settings['id'], $settings['upload_quota']) || !$event->file->isNew()) {
      return;
    }

    $query = $this->database->select('file_managed', 'f');
    $query->addExpression('SUM([f].[filesize])');
    $query->condition('f.uid', 1, '>');
    $used = (int) $query->execute()->fetchField();

    if ($used + $event->file->getSize() > $settings['upload_quota']) {
      $message = $this->t('The uploads of this sandbox are limited to @quota.', [
        '@quota' => ByteSizeMarkup::create($settings['upload_quota']),
      ]);
      $event->violations->add(new ConstraintViolation($message, NULL, [], $event->file, NULL, $event->file->getSize()));
    }
  }

}
