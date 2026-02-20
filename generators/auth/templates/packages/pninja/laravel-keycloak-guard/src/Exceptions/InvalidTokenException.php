<?php

declare(strict_types=1);

namespace Pninja\KeycloakGuard\Exceptions;

use Exception;

class InvalidTokenException extends Exception
{
    public static function missingToken(): self
    {
        return new self('No token provided in request.');
    }

    public static function invalidSignature(): self
    {
        return new self('Token signature verification failed.');
    }

    public static function expired(): self
    {
        return new self('Token has expired.');
    }

    public static function notYetValid(): self
    {
        return new self('Token is not yet valid.');
    }

    public static function invalidResource(): self
    {
        return new self('Token does not contain any of the allowed resources.');
    }

    public static function jwksFetchFailed(string $url, string $reason): self
    {
        return new self("Failed to fetch JWKS from {$url}: {$reason}");
    }

    public static function publicKeyNotResolved(): self
    {
        return new self('Could not resolve a public key for the token.');
    }

    public static function unsupportedAlgorithm(string $alg): self
    {
        return new self("Unsupported token algorithm: {$alg}");
    }
}
