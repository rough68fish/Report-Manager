<?php

namespace Drupal\okta_bearer_auth\Authentication\Provider;

use Drupal\Core\Authentication\AuthenticationProviderInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\RequestException;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Request;

/**
 * Authenticates requests using an Okta-issued Bearer token.
 *
 * Flow:
 *  1. Request arrives with "Authorization: Bearer <token>" header
 *  2. Module calls Okta's token introspection endpoint to verify it
 *  3. If active, the request is authenticated as the configured service account
 *  4. Drupal then applies that user's permissions to the JSON:API response
 */
class OktaBearerAuth implements AuthenticationProviderInterface {

  public function __construct(
    protected ConfigFactoryInterface $configFactory,
    protected EntityTypeManagerInterface $entityTypeManager,
    protected ClientInterface $httpClient,
    protected LoggerInterface $logger,
  ) {}

  /**
   * {@inheritdoc}
   *
   * Only applies to requests that carry a Bearer token.
   */
  public function applies(Request $request): bool {
    $auth = $request->headers->get('Authorization', '');
    return str_starts_with($auth, 'Bearer ');
  }

  /**
   * {@inheritdoc}
   *
   * Introspects the token with Okta. Returns the API service Drupal user
   * account if valid, or NULL to fall through to anonymous access.
   */
  public function authenticate(Request $request): mixed {
    $token = substr($request->headers->get('Authorization'), 7);

    $config          = $this->configFactory->get('okta_bearer_auth.settings');
    $domain          = rtrim((string) $config->get('okta_domain'), '/');
    $client_id       = (string) $config->get('api_client_id');
    $client_secret   = (string) $config->get('api_client_secret');
    $auth_server     = $config->get('auth_server') ?: 'default';
    $service_account = $config->get('service_account_name') ?: 'api_service';

    if (empty($domain) || empty($client_id) || empty($client_secret)) {
      $this->logger->warning('Okta Bearer Auth: module is not configured. Set okta_bearer_auth.settings via Drush or the okta-configure.sh script.');
      return NULL;
    }

    $introspect_url = "{$domain}/oauth2/{$auth_server}/v1/introspect";

    try {
      $response = $this->httpClient->post($introspect_url, [
        // Okta requires client credentials as HTTP Basic Auth on introspection
        'auth'        => [$client_id, $client_secret],
        'form_params' => [
          'token'           => $token,
          'token_type_hint' => 'access_token',
        ],
      ]);

      $data = json_decode((string) $response->getBody(), TRUE);

      if (empty($data['active'])) {
        $this->logger->info('Okta Bearer Auth: token is not active or has expired.');
        return NULL;
      }

      // Token is valid — load and return the Drupal API service account
      $users = $this->entityTypeManager
        ->getStorage('user')
        ->loadByProperties(['name' => $service_account, 'status' => 1]);

      if (empty($users)) {
        $this->logger->error('Okta Bearer Auth: service account "@name" not found. Run okta-configure.sh to create it.', [
          '@name' => $service_account,
        ]);
        return NULL;
      }

      $this->logger->info('Okta Bearer Auth: authenticated request as "@name" (sub: @sub)', [
        '@name' => $service_account,
        '@sub'  => $data['sub'] ?? 'unknown',
      ]);

      return reset($users);
    }
    catch (RequestException $e) {
      $this->logger->error('Okta Bearer Auth: introspection request failed: @msg', [
        '@msg' => $e->getMessage(),
      ]);
      return NULL;
    }
  }

}
