<?php

declare(strict_types=1);

namespace Pninja\KeycloakGuard\Testing;

use Illuminate\Support\Facades\Auth;

/**
 * Drop-in replacement for robsontenorio's ActingAsKeycloakUser trait.
 *
 * Usage in Pest/PHPUnit tests:
 *
 *   use Pninja\KeycloakGuard\Testing\ActingAsKeycloakUser;
 *
 *   it('accesses a protected route', function () {
 *       $this->actingAsKeycloakUser()
 *            ->getJson('/api/me')
 *            ->assertOk();
 *   });
 *
 *   // With a real user model:
 *   it('returns the user', function () {
 *       $user = User::factory()->create();
 *       $this->actingAsKeycloakUser($user, ['preferred_username' => $user->username])
 *            ->getJson('/api/me')
 *            ->assertOk();
 *   });
 */
trait ActingAsKeycloakUser
{
    /**
     * @param  \Illuminate\Contracts\Auth\Authenticatable|null  $user
     *         The user model to bind. When null a bare anonymous user is used.
     * @param  array  $claims
     *         Additional JWT claims to merge into the fake token payload.
     * @param  string  $guard   The guard name configured in config/auth.php.
     */
    public function actingAsKeycloakUser(
        $user = null,
        array $claims = [],
        string $guard = 'api',
    ): static {
        $keycloakGuard = Auth::guard($guard);

        if (! $keycloakGuard instanceof \Pninja\KeycloakGuard\KeycloakGuard) {
            throw new \LogicException(
                "The guard [{$guard}] is not a KeycloakGuard instance. "
                . "Make sure your config/auth.php uses driver 'keycloak'."
            );
        }

        // If no user was passed, create a minimal anonymous user from claims
        if ($user === null) {
            $defaultClaims = array_merge([
                'sub'                => 'test-user-sub',
                'preferred_username' => 'testuser',
                'email'              => 'testuser@example.com',
                'name'               => 'Test User',
                'resource_access'    => [],
            ], $claims);

            $user = $this->buildAnonymousUser($defaultClaims);
        }

        $keycloakGuard->setUser($user);

        // Also set on the default auth so Auth::user() works everywhere
        $this->app['auth']->guard($guard)->setUser($user);

        return $this;
    }

    private function buildAnonymousUser(array $claims): \Illuminate\Contracts\Auth\Authenticatable
    {
        return new class($claims) implements \Illuminate\Contracts\Auth\Authenticatable {
            public array $token;

            public function __construct(private readonly array $claims)
            {
                $this->token = $claims;
            }

            public function getAuthIdentifierName(): string { return 'sub'; }
            public function getAuthIdentifier(): mixed       { return $this->claims['sub'] ?? null; }
            public function getAuthPassword(): string        { return ''; }
            public function getRememberToken(): ?string      { return null; }
            public function setRememberToken($value): void   {}
            public function getRememberTokenName(): string   { return ''; }
            public function getAuthPasswordName(): string    { return 'password'; }

            public function __get(string $name): mixed
            {
                return $this->claims[$name] ?? null;
            }
        };
    }
}
