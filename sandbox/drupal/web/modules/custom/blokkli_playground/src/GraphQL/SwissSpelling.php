<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground\GraphQL;

use Drupal\graphql\GraphQL\Execution\FieldContext;
use Drupal\graphql\GraphQL\Execution\ResolveContext;
use Drupal\graphql\GraphQL\Resolver\ResolverInterface;
use Drupal\graphql_core_schema\CoreComposableResolver;
use GraphQL\Type\Definition\ResolveInfo;

/**
 * Writes "ss" for "ß", as Swiss German does.
 *
 * Wraps graphql_core_schema's default resolver, which resolves a string field
 * to its stored value. The stored value keeps its "ß": like a text format, this
 * only changes what's rendered.
 */
final class SwissSpelling implements ResolverInterface {

  /**
   * {@inheritdoc}
   */
  public function resolve(mixed $value, array $args, ResolveContext $context, ResolveInfo $info, FieldContext $field): mixed {
    $result = CoreComposableResolver::resolveFieldDefault($value, $args, $context, $info, $field);
    return is_string($result) ? str_replace(['ß', 'ẞ'], ['ss', 'SS'], $result) : $result;
  }

}
