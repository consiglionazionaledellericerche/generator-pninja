<?php

declare(strict_types=1);

namespace Pninja\KeycloakGuard;

use DateInterval;
use Lcobucci\Clock\SystemClock;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Token\Plain;
use Lcobucci\JWT\Validation\Constraint\LooseValidAt;
use Lcobucci\JWT\Validation\Constraint\SignedWith;
use Lcobucci\JWT\Validation\RequiredConstraintsViolated;
use Pninja\KeycloakGuard\Exceptions\InvalidTokenException;

class TokenDecoder
{
    public function __construct(
        private readonly array $config,
        private readonly ?JwksFetcher $jwksFetcher = null,
    ) {}

    /**
     * Parses and validates the given JWT string.
     * Returns a Plain token with all claims accessible.
     *
     * @throws InvalidTokenException
     */
    public function decode(string $tokenString): Plain
    {
        $signer = $this->getSigner();

        // Parse without verification first so we can read the header (kid, alg)
        $insecureParser = Configuration::forUnsecuredSigner();
        $parsed         = $insecureParser->parser()->parse($tokenString);

        if (! $parsed instanceof Plain) {
            throw InvalidTokenException::invalidSignature();
        }

        $publicKeyPem = $this->resolvePublicKey($parsed);
        $key          = InMemory::plainText($publicKeyPem);
        $clock        = new SystemClock(new \DateTimeZone('UTC'));

        $configuration = $this->buildConfiguration($signer, $key);

        $constraints = [
            new SignedWith($signer, $key),
            new LooseValidAt($clock, new DateInterval('PT' . max(0, (int) ($this->config['leeway'] ?? 0)) . 'S')),
        ];

        try {
            $configuration->validator()->assert($parsed, ...$constraints);
        } catch (RequiredConstraintsViolated $e) {
            $violations = $e->violations();
            $first      = reset($violations);
            $message    = $first ? $first->getMessage() : $e->getMessage();

            if (str_contains($message, 'signature')) {
                throw InvalidTokenException::invalidSignature();
            }
            if (str_contains($message, 'expired')) {
                throw InvalidTokenException::expired();
            }
            if (str_contains($message, 'not yet')) {
                throw InvalidTokenException::notYetValid();
            }

            throw new InvalidTokenException($message, 0, $e);
        }

        return $parsed;
    }

    /**
     * Returns all claims as an associative array.
     * Handles the lcobucci/jwt DataSet structure transparently.
     */
    public function claims(Plain $token): array
    {
        $claims = [];

        foreach ($token->claims()->all() as $name => $value) {
            // DateTimeImmutable claims (iat, exp, nbf) → integer timestamps
            if ($value instanceof \DateTimeImmutable) {
                $claims[$name] = $value->getTimestamp();
            } else {
                $claims[$name] = $value;
            }
        }

        return $claims;
    }

    // -------------------------------------------------------------------------

    /** @throws InvalidTokenException */
    private function resolvePublicKey(Plain $token): string
    {
        $staticKey = trim($this->config['realm_public_key'] ?? '');

        if ($staticKey !== '') {
            return $this->wrapPublicKey($staticKey);
        }

        if ($this->jwksFetcher === null) {
            throw InvalidTokenException::publicKeyNotResolved();
        }

        $kid = $token->headers()->get('kid');

        return $this->jwksFetcher->getPublicKey($kid ?: null);
    }

    private function wrapPublicKey(string $key): string
    {
        // Already in PEM format
        if (str_contains($key, '-----BEGIN')) {
            return $key;
        }

        // Raw base64 — wrap it
        return "-----BEGIN PUBLIC KEY-----\n"
            . chunk_split($key, 64, "\n")
            . "-----END PUBLIC KEY-----\n";
    }

    /** @throws InvalidTokenException */
    private function getSigner(): Signer
    {
        $alg = strtoupper($this->config['token_encryption_algorithm'] ?? 'RS256');

        return match ($alg) {
            'RS256' => new Signer\Rsa\Sha256(),
            'RS384' => new Signer\Rsa\Sha384(),
            'RS512' => new Signer\Rsa\Sha512(),
            'ES256' => new Signer\Ecdsa\Sha256(),
            'ES384' => new Signer\Ecdsa\Sha384(),
            'ES512' => new Signer\Ecdsa\Sha512(),
            'HS256' => new Signer\Hmac\Sha256(),
            'HS384' => new Signer\Hmac\Sha384(),
            'HS512' => new Signer\Hmac\Sha512(),
            default => throw InvalidTokenException::unsupportedAlgorithm($alg),
        };
    }

    private function buildConfiguration(Signer $signer, InMemory $key): Configuration
    {
        if ($signer instanceof Signer\Hmac) {
            return Configuration::forSymmetricSigner($signer, $key);
        }

        // For asymmetric signers we only verify, so the signing key can be
        // a placeholder — lcobucci requires both keys in the constructor.
        return Configuration::forAsymmetricSigner(
            $signer,
            InMemory::plainText(''), // not used for verification
            $key
        );
    }
}
