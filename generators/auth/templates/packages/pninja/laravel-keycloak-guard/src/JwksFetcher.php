<?php

declare(strict_types=1);

namespace Pninja\KeycloakGuard;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Pninja\KeycloakGuard\Exceptions\InvalidTokenException;

/**
 * Fetches and caches the JWKS (JSON Web Key Set) from Keycloak.
 *
 * The JWKS endpoint is:
 *   {base_url}/realms/{realm}/protocol/openid-connect/certs
 */
class JwksFetcher
{
    private string $jwksUrl;
    private int $cacheTtl;

    public function __construct(string $baseUrl, string $realm, int $cacheTtl = 300)
    {
        $baseUrl = rtrim($baseUrl, '/');
        $this->jwksUrl = "{$baseUrl}/realms/{$realm}/protocol/openid-connect/certs";
        $this->cacheTtl = $cacheTtl;
    }

    /**
     * Returns the PEM-encoded public key matching the given $kid.
     * If $kid is null, returns the first key in the set.
     *
     * @throws InvalidTokenException
     */
    public function getPublicKey(?string $kid): string
    {
        $keys = $this->fetchKeys();

        if ($kid !== null) {
            foreach ($keys as $key) {
                if (($key['kid'] ?? null) === $kid) {
                    return $this->jwkToPem($key);
                }
            }

            // kid not found — invalidate cache and retry once
            $this->invalidateCache();
            $keys = $this->fetchKeys();

            foreach ($keys as $key) {
                if (($key['kid'] ?? null) === $kid) {
                    return $this->jwkToPem($key);
                }
            }

            throw InvalidTokenException::publicKeyNotResolved();
        }

        if (empty($keys)) {
            throw InvalidTokenException::publicKeyNotResolved();
        }

        return $this->jwkToPem($keys[0]);
    }

    /** @throws InvalidTokenException */
    private function fetchKeys(): array
    {
        $cacheKey = 'keycloak_jwks_' . md5($this->jwksUrl);

        return Cache::remember($cacheKey, $this->cacheTtl, function () {
            $response = Http::timeout(5)->get($this->jwksUrl);

            if (! $response->successful()) {
                throw InvalidTokenException::jwksFetchFailed(
                    $this->jwksUrl,
                    "HTTP {$response->status()}"
                );
            }

            $body = $response->json();

            if (! isset($body['keys']) || ! is_array($body['keys'])) {
                throw InvalidTokenException::jwksFetchFailed(
                    $this->jwksUrl,
                    'Invalid JWKS response structure'
                );
            }

            // Only keep signing keys (use === 'sig')
            return array_values(array_filter(
                $body['keys'],
                fn(array $k) => ($k['use'] ?? 'sig') === 'sig'
            ));
        });
    }

    private function invalidateCache(): void
    {
        $cacheKey = 'keycloak_jwks_' . md5($this->jwksUrl);
        Cache::forget($cacheKey);
    }

    /**
     * Converts a JWK (RSA/EC) to a PEM-encoded public key string.
     *
     * @throws InvalidTokenException
     */
    private function jwkToPem(array $jwk): string
    {
        $kty = $jwk['kty'] ?? null;

        return match ($kty) {
            'RSA' => $this->rsaJwkToPem($jwk),
            'EC'  => $this->ecJwkToPem($jwk),
            default => throw InvalidTokenException::publicKeyNotResolved(),
        };
    }

    /** @throws InvalidTokenException */
    private function rsaJwkToPem(array $jwk): string
    {
        if (! isset($jwk['n'], $jwk['e'])) {
            throw InvalidTokenException::publicKeyNotResolved();
        }

        // Use x5c (certificate chain) if available — fastest path
        if (! empty($jwk['x5c'][0])) {
            $cert = "-----BEGIN CERTIFICATE-----\n"
                . chunk_split($jwk['x5c'][0], 64, "\n")
                . "-----END CERTIFICATE-----\n";

            $pubKey = openssl_pkey_get_public($cert);
            if ($pubKey === false) {
                throw InvalidTokenException::publicKeyNotResolved();
            }

            $details = openssl_pkey_get_details($pubKey);
            return $details['key'] ?? throw InvalidTokenException::publicKeyNotResolved();
        }

        // Build from n/e modulus+exponent
        $n = $this->base64UrlDecode($jwk['n']);
        $e = $this->base64UrlDecode($jwk['e']);

        $publicKey = openssl_pkey_get_public([
            'n' => $n,
            'e' => $e,
        ]);

        // openssl_pkey_get_public does not accept raw n/e arrays in PHP < 8.1 style.
        // Use the DER/ASN1 approach as a reliable fallback:
        $pem = $this->rsaPublicKeyToPem($n, $e);

        return $pem;
    }

    private function rsaPublicKeyToPem(string $n, string $e): string
    {
        // ASN.1 encode the RSA public key (PKCS#1 wrapped in SubjectPublicKeyInfo)
        $modulus  = $this->asn1Integer($n);
        $exponent = $this->asn1Integer($e);

        // RSAPublicKey SEQUENCE
        $rsaKey = "\x30" . $this->asn1Length($modulus . $exponent) . $modulus . $exponent;

        // AlgorithmIdentifier for rsaEncryption
        $algorithmIdentifier = "\x30\x0d"
            . "\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01" // OID 1.2.840.113549.1.1.1
            . "\x05\x00";

        // SubjectPublicKeyInfo
        $spki = "\x30" . $this->asn1Length(
                $algorithmIdentifier
                . "\x03" . $this->asn1Length("\x00" . $rsaKey) . "\x00" . $rsaKey
            )
            . $algorithmIdentifier
            . "\x03" . $this->asn1Length("\x00" . $rsaKey) . "\x00" . $rsaKey;

        return "-----BEGIN PUBLIC KEY-----\n"
            . chunk_split(base64_encode($spki), 64, "\n")
            . "-----END PUBLIC KEY-----\n";
    }

    /** @throws InvalidTokenException */
    private function ecJwkToPem(array $jwk): string
    {
        if (! isset($jwk['crv'], $jwk['x'], $jwk['y'])) {
            throw InvalidTokenException::publicKeyNotResolved();
        }

        // Use x5c when available
        if (! empty($jwk['x5c'][0])) {
            $cert = "-----BEGIN CERTIFICATE-----\n"
                . chunk_split($jwk['x5c'][0], 64, "\n")
                . "-----END CERTIFICATE-----\n";

            $pubKey = openssl_pkey_get_public($cert);
            if ($pubKey === false) {
                throw InvalidTokenException::publicKeyNotResolved();
            }

            $details = openssl_pkey_get_details($pubKey);
            return $details['key'] ?? throw InvalidTokenException::publicKeyNotResolved();
        }

        $curveOids = [
            'P-256' => "\x2a\x86\x48\xce\x3d\x03\x01\x07",
            'P-384' => "\x2b\x81\x04\x00\x22",
            'P-521' => "\x2b\x81\x04\x00\x23",
        ];

        $crv = $jwk['crv'];
        if (! isset($curveOids[$crv])) {
            throw InvalidTokenException::publicKeyNotResolved();
        }

        $x = $this->base64UrlDecode($jwk['x']);
        $y = $this->base64UrlDecode($jwk['y']);

        $oid = $curveOids[$crv];
        $point = "\x04" . $x . $y; // uncompressed point

        $algorithmIdentifier = "\x30" . $this->asn1Length(
                "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01" // OID id-ecPublicKey
                . "\x06" . chr(strlen($oid)) . $oid
            )
            . "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01"
            . "\x06" . chr(strlen($oid)) . $oid;

        $spki = "\x30" . $this->asn1Length(
                $algorithmIdentifier
                . "\x03" . $this->asn1Length("\x00" . $point) . "\x00" . $point
            )
            . $algorithmIdentifier
            . "\x03" . $this->asn1Length("\x00" . $point) . "\x00" . $point;

        return "-----BEGIN PUBLIC KEY-----\n"
            . chunk_split(base64_encode($spki), 64, "\n")
            . "-----END PUBLIC KEY-----\n";
    }

    private function base64UrlDecode(string $data): string
    {
        $padded = str_pad(strtr($data, '-_', '+/'), strlen($data) + (4 - strlen($data) % 4) % 4, '=');
        return base64_decode($padded);
    }

    private function asn1Integer(string $data): string
    {
        // Ensure positive integer (prepend 0x00 if high bit set)
        if (ord($data[0]) > 0x7f) {
            $data = "\x00" . $data;
        }
        return "\x02" . $this->asn1Length($data) . $data;
    }

    private function asn1Length(string $data): string
    {
        $len = strlen($data);
        if ($len < 128) {
            return chr($len);
        }
        $lenBytes = '';
        while ($len > 0) {
            $lenBytes = chr($len & 0xff) . $lenBytes;
            $len >>= 8;
        }
        return chr(0x80 | strlen($lenBytes)) . $lenBytes;
    }
}
