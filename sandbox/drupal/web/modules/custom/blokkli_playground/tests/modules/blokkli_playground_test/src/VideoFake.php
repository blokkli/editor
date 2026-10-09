<?php

declare(strict_types=1);

namespace Drupal\blokkli_playground_test;

use GuzzleHttp\Promise\Create;
use GuzzleHttp\Psr7\Response;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * Answers the requests for YouTube and Vimeo videos without the network.
 *
 * Adding a remote video fetches oEmbed's list of providers, the video's oEmbed
 * data and its thumbnail, all through the http_client. This middleware answers
 * them: every video exists, with the same title and thumbnail. The providers
 * have no discovery, which would fetch the video's page.
 */
final class VideoFake {

  /**
   * The providers of the media type remote_video, as oembed.com lists them.
   */
  private const PROVIDERS = [
    [
      'provider_name' => 'YouTube',
      'provider_url' => 'https://www.youtube.com/',
      'endpoints' => [
        [
          'schemes' => ['https://*.youtube.com/watch*', 'https://youtu.be/*'],
          'url' => 'https://www.youtube.com/oembed',
        ],
      ],
    ],
    [
      'provider_name' => 'Vimeo',
      'provider_url' => 'https://vimeo.com/',
      'endpoints' => [
        [
          'schemes' => ['https://vimeo.com/*'],
          'url' => 'https://vimeo.com/api/oembed.json',
        ],
      ],
    ],
  ];

  /**
   * The middleware.
   */
  public function __invoke(): callable {
    return function (callable $handler): callable {
      return function (RequestInterface $request, array $options) use ($handler) {
        $response = $this->respond($request);
        return $response ? Create::promiseFor($response) : $handler($request, $options);
      };
    };
  }

  /**
   * The fake response to a request, or NULL to send it.
   */
  private function respond(RequestInterface $request): ?ResponseInterface {
    $uri = $request->getUri();
    parse_str($uri->getQuery(), $query);
    return match ($uri->getHost() . $uri->getPath()) {
      'oembed.com/providers.json' => $this->json(self::PROVIDERS),
      'www.youtube.com/oembed' => $this->json($this->resource('YouTube', (string) ($query['url'] ?? ''))),
      'vimeo.com/api/oembed.json' => $this->json($this->resource('Vimeo', (string) ($query['url'] ?? ''))),
      'thumbnails.blokkli.test/video.jpg' => new Response(200, ['Content-Type' => 'image/jpeg'], (string) file_get_contents(__DIR__ . '/../thumbnail.jpg')),
      default => NULL,
    };
  }

  /**
   * A video's oEmbed data.
   */
  private function resource(string $provider, string $url): array {
    return [
      'type' => 'video',
      'version' => '1.0',
      'title' => "A video on $provider",
      'provider_name' => $provider,
      'thumbnail_url' => 'https://thumbnails.blokkli.test/video.jpg',
      'thumbnail_width' => 480,
      'thumbnail_height' => 360,
      'width' => 480,
      'height' => 270,
      'html' => '<iframe src="' . htmlspecialchars($url) . '" width="480" height="270"></iframe>',
    ];
  }

  /**
   * A JSON response.
   */
  private function json(array $data): ResponseInterface {
    return new Response(200, ['Content-Type' => 'application/json'], json_encode($data, JSON_THROW_ON_ERROR));
  }

}
