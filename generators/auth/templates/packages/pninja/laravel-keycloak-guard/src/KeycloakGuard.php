<?php

declare(strict_types=1);

namespace Pninja\KeycloakGuard;

use Illuminate\Auth\GuardHelpers;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;
use Lcobucci\JWT\Token\Plain;
use Pninja\KeycloakGuard\Exceptions\InvalidTokenException;

class KeycloakGuard implements Guard
{
    use GuardHelpers;

    private array  $config;
    private Request $request;
    private TokenDecoder $decoder;

    /** Decoded token claims cached for the current request */
    private ?array $decodedToken = null;
    private bool   $tokenResolved = false;

    public function __construct(
        UserProvider $provider,
        Request $request,
        array $config,
        TokenDecoder $decoder,
    ) {
        $this->provider = $provider;
        $this->request  = $request;
        $this->config   = $config;
        $this->decoder  = $decoder;
    }

    // -------------------------------------------------------------------------
    // Guard contract
    // -------------------------------------------------------------------------

    public function user(): ?Authenticatable
    {
        if ($this->user !== null) {
            return $this->user;
        }

        try {
            $claims = $this->getDecodedToken();
        } catch (InvalidTokenException) {
            return null;
        }

        if ($claims === null) {
            return null;
        }

        if (! $this->config['ignore_resources_validation']) {
            $this->validateResources($claims);
        }

        $this->user = $this->resolveUser($claims);

        if ($this->user && $this->config['append_decoded_token']) {
            $this->user->token = $claims;
        }

        return $this->user;
    }

    public function validate(array $credentials = []): bool
    {
        return false; // stateless guard — validation not applicable
    }

    public function check(): bool
    {
        return $this->user() !== null;
    }

    public function guest(): bool
    {
        return ! $this->check();
    }

    public function id(): int|string|null
    {
        return $this->user()?->getAuthIdentifier();
    }

    public function setUser(Authenticatable $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function hasUser(): bool
    {
        return $this->user !== null;
    }

    // -------------------------------------------------------------------------
    // Role helpers (mirrors robsontenorio API)
    // -------------------------------------------------------------------------

    /**
     * Returns true if the authenticated token contains the given role
     * under the specified resource (client_id).
     */
    public function hasRole(string $resource, string $role): bool
    {
        try {
            $claims = $this->getDecodedToken();
        } catch (InvalidTokenException) {
            return false;
        }

        $roles = $claims['resource_access'][$resource]['roles'] ?? [];

        return in_array($role, (array) $roles, true);
    }

    /**
     * Returns all roles for the given resource from the token.
     *
     * @return string[]
     */
    public function roles(string $resource): array
    {
        try {
            $claims = $this->getDecodedToken();
        } catch (InvalidTokenException) {
            return [];
        }

        return (array) ($claims['resource_access'][$resource]['roles'] ?? []);
    }

    /**
     * Returns raw decoded token claims (or null when no valid token).
     */
    public function token(): ?array
    {
        try {
            return $this->getDecodedToken();
        } catch (InvalidTokenException) {
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    /** @throws InvalidTokenException */
    private function getDecodedToken(): ?array
    {
        if ($this->tokenResolved) {
            return $this->decodedToken;
        }

        $this->tokenResolved = true;
        $rawToken = $this->extractToken();

        if ($rawToken === null) {
            return null;
        }

        $plain             = $this->decoder->decode($rawToken);
        $this->decodedToken = $this->decoder->claims($plain);

        return $this->decodedToken;
    }

    private function extractToken(): ?string
    {
        $token = $this->request->bearerToken();

        if ($token === null && ! empty($this->config['input_key'])) {
            $token = $this->request->input($this->config['input_key']);
        }

        return $token ?: null;
    }

    /** @throws InvalidTokenException */
    private function validateResources(array $claims): void
    {
        $allowed = array_filter(
            array_map('trim', explode(',', $this->config['allowed_resources'] ?? ''))
        );

        if (empty($allowed)) {
            return;
        }

        $resourceAccess = array_keys($claims['resource_access'] ?? []);

        if (empty(array_intersect($allowed, $resourceAccess))) {
            throw InvalidTokenException::invalidResource();
        }
    }

    private function resolveUser(array $claims): ?Authenticatable
    {
        if (! $this->config['load_user_from_database']) {
            return $this->buildUserFromClaims($claims);
        }

        $customMethod = $this->config['user_provider_custom_retrieve_method'] ?? null;

        if ($customMethod) {
            return $this->provider->{$customMethod}($claims);
        }

        $credential = $this->config['user_provider_credential'] ?? 'username';
        $attribute  = $this->config['token_principal_attribute'] ?? 'preferred_username';

        return $this->provider->retrieveByCredentials([
            $credential => $claims[$attribute] ?? null,
        ]);
    }

    /**
     * When load_user_from_database is false, builds an anonymous user
     * object from the JWT claims so that Auth::user() always returns something
     * usable.
     */
    private function buildUserFromClaims(array $claims): Authenticatable
    {
        return new class($claims) implements Authenticatable {
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
