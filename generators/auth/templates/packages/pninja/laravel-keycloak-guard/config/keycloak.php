<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Keycloak Server URL
    |--------------------------------------------------------------------------
    | Base URL of your Keycloak instance, e.g. https://keycloak.example.com
    | Required when using JWKS discovery (realm_public_key left empty).
    */
    'base_url' => env('KEYCLOAK_BASE_URL', ''),

    /*
    |--------------------------------------------------------------------------
    | Keycloak Realm
    |--------------------------------------------------------------------------
    */
    'realm' => env('KEYCLOAK_REALM', 'master'),

    /*
    |--------------------------------------------------------------------------
    | Realm Public Key (static)
    |--------------------------------------------------------------------------
    | The RS256 public key copied from:
    |   Realm Settings → Keys → RS256 row → Public Key button
    |
    | If left empty, the guard will fetch keys dynamically from the JWKS
    | endpoint: {base_url}/realms/{realm}/protocol/openid-connect/certs
    |
    | Example (without BEGIN/END headers):
    |   KEYCLOAK_REALM_PUBLIC_KEY=MIIBIjANBgkqhk...
    */
    'realm_public_key' => env('KEYCLOAK_REALM_PUBLIC_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Token Encryption Algorithm
    |--------------------------------------------------------------------------
    | Supported: RS256, RS384, RS512, ES256, ES384, ES512, HS256, HS384, HS512
    */
    'token_encryption_algorithm' => env('KEYCLOAK_TOKEN_ENCRYPTION_ALGORITHM', 'RS256'),

    /*
    |--------------------------------------------------------------------------
    | Load User From Database
    |--------------------------------------------------------------------------
    | When true the guard calls Auth::user() retrieving the user from DB.
    | When false it builds a user object directly from the JWT claims.
    */
    'load_user_from_database' => env('KEYCLOAK_LOAD_USER_FROM_DATABASE', true),

    /*
    |--------------------------------------------------------------------------
    | User Provider Custom Method
    |--------------------------------------------------------------------------
    | When set, this method is called on the UserProvider instead of
    | retrieveByCredentials(). It receives the full decoded token.
    */
    'user_provider_custom_retrieve_method' => env('KEYCLOAK_USER_PROVIDER_CUSTOM_METHOD', null),

    /*
    |--------------------------------------------------------------------------
    | User Provider Credential (DB field)
    |--------------------------------------------------------------------------
    | The column in your users table used to look up the user.
    */
    'user_provider_credential' => env('KEYCLOAK_USER_PROVIDER_CREDENTIAL', 'username'),

    /*
    |--------------------------------------------------------------------------
    | Token Principal Attribute (JWT claim)
    |--------------------------------------------------------------------------
    | The claim in the JWT token that maps to user_provider_credential.
    */
    'token_principal_attribute' => env('KEYCLOAK_TOKEN_PRINCIPAL_ATTRIBUTE', 'preferred_username'),

    /*
    |--------------------------------------------------------------------------
    | Append Decoded Token
    |--------------------------------------------------------------------------
    | When true the decoded token claims are appended to the user object
    | as the `token` attribute.
    */
    'append_decoded_token' => env('KEYCLOAK_APPEND_DECODED_TOKEN', false),

    /*
    |--------------------------------------------------------------------------
    | Allowed Resources
    |--------------------------------------------------------------------------
    | Comma-separated list of Keycloak client IDs whose resource_access
    | must be present in the token. Leave empty to skip resource validation.
    |
    | Example: KEYCLOAK_ALLOWED_RESOURCES=my-api,another-api
    */
    'allowed_resources' => env('KEYCLOAK_ALLOWED_RESOURCES', ''),

    /*
    |--------------------------------------------------------------------------
    | Ignore Resources Validation
    |--------------------------------------------------------------------------
    | Set to true to completely skip resource_access validation.
    */
    'ignore_resources_validation' => env('KEYCLOAK_IGNORE_RESOURCES_VALIDATION', false),

    /*
    |--------------------------------------------------------------------------
    | Leeway (seconds)
    |--------------------------------------------------------------------------
    | Clock skew tolerance between your server and Keycloak.
    | Useful when you get "token not yet valid" / "token expired" errors.
    */
    'leeway' => env('KEYCLOAK_LEEWAY', 0),

    /*
    |--------------------------------------------------------------------------
    | Input Key
    |--------------------------------------------------------------------------
    | When set, the guard also looks for a token in this request parameter
    | in addition to the Authorization: Bearer header.
    | Example: KEYCLOAK_INPUT_KEY=api_token
    */
    'input_key' => env('KEYCLOAK_INPUT_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | JWKS Cache TTL (seconds)
    |--------------------------------------------------------------------------
    | How long to cache the remote JWKS response.
    | Set to 0 to disable caching (not recommended in production).
    */
    'jwks_cache_ttl' => env('KEYCLOAK_JWKS_CACHE_TTL', 300),

];
