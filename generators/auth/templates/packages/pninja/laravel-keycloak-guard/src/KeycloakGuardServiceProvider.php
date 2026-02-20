<?php

declare(strict_types=1);

namespace Pninja\KeycloakGuard;

use Illuminate\Support\ServiceProvider;

class KeycloakGuardServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__ . '/../config/keycloak.php',
            'keycloak'
        );

        // Registra il driver 'keycloak' in register() e non in boot() per evitare
        // che DatabaseSessionHandler (o altri listener early-boot) lo risolvano
        // prima che il service provider abbia completato il boot.
        $this->app['auth']->extend('keycloak', function ($app, $name, array $config) {
            $keycloakConfig = $app['config']['keycloak'];

            $jwksFetcher = null;
            if (empty(trim($keycloakConfig['realm_public_key'] ?? ''))) {
                $jwksFetcher = new JwksFetcher(
                    $keycloakConfig['base_url'],
                    $keycloakConfig['realm'],
                    (int) ($keycloakConfig['jwks_cache_ttl'] ?? 300),
                );
            }

            $decoder = new TokenDecoder($keycloakConfig, $jwksFetcher);

            return new KeycloakGuard(
                $app['auth']->createUserProvider($config['provider']),
                $app['request'],
                $keycloakConfig,
                $decoder,
            );
        });
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/keycloak.php' => config_path('keycloak.php'),
            ], 'keycloak-config');
        }
    }
}