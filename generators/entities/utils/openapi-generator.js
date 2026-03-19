import to from 'to-case';
import pluralize from 'pluralize';
import { getEntities, getEntitiesRelationships, getEnums } from '../../utils/entities-utils.js';

// Maps JDL types to OpenAPI 3.0 schema properties
function jdlTypeToOpenApi(type, enums = []) {
    switch (type) {
        case 'String':
            return { type: 'string' };
        case 'TextBlob':
            return { type: 'string' };
        case 'UUID':
            return { type: 'string', format: 'uuid' };
        case 'Integer':
            return { type: 'integer', format: 'int32' };
        case 'Long':
            return { type: 'integer', format: 'int64' };
        case 'Float':
            return { type: 'number', format: 'float' };
        case 'Double':
            return { type: 'number', format: 'double' };
        case 'BigDecimal':
            return { type: 'number', format: 'decimal' };
        case 'Boolean':
            return { type: 'boolean' };
        case 'LocalDate':
        case 'Date':
            return { type: 'string', format: 'date' };
        case 'ZonedDateTime':
        case 'Instant':
            return { type: 'string', format: 'date-time' };
        case 'LocalTime':
            return { type: 'string', format: 'time' };
        case 'Duration':
            return { type: 'integer', format: 'int64', description: 'Duration in milliseconds' };
        case 'Blob':
        case 'AnyBlob':
        case 'ImageBlob':
            // Blob fields are handled separately as JSON objects — this case should not be reached
            return { type: 'object' };
        default:
            if (enums.find(e => e.name === type)) {
                return { $ref: `#/components/schemas/${type}` };
            }
            return { type: 'string' };
    }
}

// Applies validation constraints to an OpenAPI schema property
function applyValidations(schema, validations, fieldType) {
    for (const v of validations) {
        switch (v.key) {
            case 'minlength':
                schema.minLength = Number(v.value);
                break;
            case 'maxlength':
                schema.maxLength = Number(v.value);
                break;
            case 'min':
                schema.minimum = Number(v.value);
                break;
            case 'max':
                schema.maximum = Number(v.value);
                break;
            case 'pattern':
                schema.pattern = v.value;
                break;
            case 'minbytes':
                schema['x-minBytes'] = Number(v.value);
                break;
            case 'maxbytes':
                schema['x-maxBytes'] = Number(v.value);
                break;
        }
    }
    return schema;
}

// Builds the schema properties for an entity READ response (fields + FK ids from relationships).
// Blobs: returned as JSON objects { type, name, size } in list responses (data omitted).
// In single-record responses (show), the full object including data is returned.
// Binary content is also served via the serveBlob endpoint.
// Write payloads use a separate schema (EntityNameWrite) with { data, type, name, size }.
function buildEntityProperties(entity, relationships, enums) {
    const properties = {
        id: { type: 'integer', format: 'int64', readOnly: true },
        created_at: { type: 'string', format: 'date-time', readOnly: true, nullable: true },
        updated_at: { type: 'string', format: 'date-time', readOnly: true, nullable: true },
        ...(entity.softDelete ? { deleted_at: { type: 'string', format: 'date-time', readOnly: true, nullable: true } } : {}),
    };
    const required = [];

    for (const field of entity.fields) {
        const isBlob = ['Blob', 'AnyBlob', 'ImageBlob'].includes(field.type);
        const isRequired = field.validations.some(v => v.key === 'required');

        if (isBlob) {
            // Blob fields are stored as JSON objects. In list responses, 'data' is omitted.
            // Binary content is served via the serveBlob endpoint.
            properties[to.snake(field.name)] = {
                type: 'object',
                nullable: !isRequired,
                description: isRequired
                    ? `File attachment for ${field.name}. 'data' (base64) is omitted in list responses.`
                    : `Optional file attachment for ${field.name}. 'data' (base64) is omitted in list responses. Null means no file.`,
                properties: {
                    type: { type: 'string', description: 'MIME type of the stored file' },
                    name: { type: 'string', description: 'Original file name' },
                    size: { type: 'integer', format: 'int64', description: 'File size in bytes', nullable: true },
                },
            };
            if (isRequired) required.push(to.snake(field.name));
        } else {
            const schema = applyValidations(
                jdlTypeToOpenApi(field.type, enums),
                field.validations,
                field.type
            );
            properties[to.snake(field.name)] = schema;
            if (isRequired) {
                required.push(to.snake(field.name));
            }
        }
    }

    // FK ids from one-to-one (owner side) and many-to-one
    relationships
        .filter(r =>
            (r.relationshipType === 'one-to-one' || r.relationshipType === 'many-to-one')
            && r.entityName === entity.name
        )
        .forEach(r => {
            const fkName = `${to.snake(r.relationshipName || r.otherEntityName)}_id`;
            properties[fkName] = { type: 'integer', format: 'int64' };
            if (r.relationshipRequired) required.push(fkName);
        });

    // FK id from one-to-many (reverse: child owns the FK)
    relationships
        .filter(r =>
            r.relationshipType === 'one-to-many'
            && r.otherEntityName === entity.name
        )
        .forEach(r => {
            const fkName = `${to.snake(r.otherEntityRelationshipName || r.entityName)}_id`;
            if (!properties[fkName]) {
                properties[fkName] = { type: 'integer', format: 'int64' };
                if (r.inverseRelationshipRequired) required.push(fkName);
            }
        });

    // M2M: array of ids
    relationships
        .filter(r => r.relationshipType === 'many-to-many' && r.entityName === entity.name)
        .forEach(r => {
            const field = to.snake(r.relationshipName || r.otherEntityName);
            properties[field] = {
                type: 'array',
                items: { type: 'integer', format: 'int64' },
                description: `IDs of related ${r.otherEntityName} records`
            };
            if (r.relationshipRequired) required.push(field);
        });

    relationships
        .filter(r => r.relationshipType === 'many-to-many' && r.otherEntityName === entity.name && r.bidirectional)
        .forEach(r => {
            const field = to.snake(r.otherEntityRelationshipName || r.entityName);
            if (!properties[field]) {
                properties[field] = {
                    type: 'array',
                    items: { type: 'integer', format: 'int64' },
                    description: `IDs of related ${r.entityName} records`
                };
                if (r.inverseRelationshipRequired) required.push(field);
            }
        });

    return { properties, required };
}

// Builds the write schema properties for POST/PUT payloads.
// Blob fields are sent as nested objects { data, type, name, size }
// matching the BlobCast → controller contract.
// Send null for a blob field to remove the existing file.
function buildWriteProperties(entity, relationships, enums) {
    const properties = {};
    const required = [];

    for (const field of entity.fields) {
        const isBlob = ['Blob', 'AnyBlob', 'ImageBlob'].includes(field.type);
        const isImageBlob = field.type === 'ImageBlob';
        const isRequired = field.validations.some(v => v.key === 'required');
        const minbytes = field.validations.find(v => v.key === 'minbytes')?.value;
        const maxbytes = field.validations.find(v => v.key === 'maxbytes')?.value;

        if (isBlob) {
            const nestedRequired = [];
            if (isRequired) nestedRequired.push('data', 'type', 'name');

            const dataSchema = {
                type: 'string',
                format: 'byte',
                description: 'Base64 encoded file content (without data URI prefix)',
            };
            if (minbytes) dataSchema['x-minBytes'] = Number(minbytes);
            if (maxbytes) dataSchema['x-maxBytes'] = Number(maxbytes);

            properties[to.snake(field.name)] = {
                type: 'object',
                nullable: true,
                description: isRequired
                    ? `Required file upload for ${field.name}. Send null to remove the existing file.`
                    : `Optional file upload for ${field.name}. Send null to remove the existing file.`,
                properties: {
                    data: dataSchema,
                    type: {
                        type: 'string',
                        description: 'MIME type of the file',
                        ...(isImageBlob ? { pattern: '^image/' } : {}),
                    },
                    name: {
                        type: 'string',
                        description: 'Original file name',
                    },
                    size: {
                        type: 'integer',
                        format: 'int64',
                        description: 'File size in bytes',
                        nullable: true,
                    },
                },
                ...(nestedRequired.length ? { required: nestedRequired } : {}),
            };
            if (isRequired) required.push(to.snake(field.name));
        } else {
            const schema = applyValidations(
                jdlTypeToOpenApi(field.type, enums),
                field.validations,
                field.type
            );
            properties[to.snake(field.name)] = schema;
            if (isRequired) required.push(to.snake(field.name));
        }
    }

    // FK ids (same logic as read schema, blobs excluded)
    relationships
        .filter(r =>
            (r.relationshipType === 'one-to-one' || r.relationshipType === 'many-to-one')
            && r.entityName === entity.name
        )
        .forEach(r => {
            const fkName = `${to.snake(r.relationshipName || r.otherEntityName)}_id`;
            properties[fkName] = { type: 'integer', format: 'int64' };
            if (r.relationshipRequired) required.push(fkName);
        });

    relationships
        .filter(r => r.relationshipType === 'one-to-many' && r.otherEntityName === entity.name)
        .forEach(r => {
            const fkName = `${to.snake(r.otherEntityRelationshipName || r.entityName)}_id`;
            if (!properties[fkName]) {
                properties[fkName] = { type: 'integer', format: 'int64' };
                if (r.inverseRelationshipRequired) required.push(fkName);
            }
        });

    relationships
        .filter(r => r.relationshipType === 'many-to-many' && r.entityName === entity.name)
        .forEach(r => {
            const fieldName = to.snake(r.relationshipName || r.otherEntityName);
            properties[fieldName] = {
                type: 'array',
                items: { type: 'integer', format: 'int64' },
                description: `IDs of related ${r.otherEntityName} records`,
            };
            if (r.relationshipRequired) required.push(fieldName);
        });

    relationships
        .filter(r => r.relationshipType === 'many-to-many' && r.otherEntityName === entity.name && r.bidirectional)
        .forEach(r => {
            const fieldName = to.snake(r.otherEntityRelationshipName || r.entityName);
            if (!properties[fieldName]) {
                properties[fieldName] = {
                    type: 'array',
                    items: { type: 'integer', format: 'int64' },
                    description: `IDs of related ${r.entityName} records`,
                };
                if (r.inverseRelationshipRequired) required.push(fieldName);
            }
        });

    return { properties, required };
}

// Builds a "WriteRequest" schema (no id) for store/update, with nested blob objects
function buildWriteSchema(entity, relationships, enums) {
    const { properties, required } = buildWriteProperties(entity, relationships, enums);
    return {
        type: 'object',
        properties,
        ...(required?.length ? { required } : {}),
    };
}

// Builds pagination envelope schema
function buildPaginatedSchema(entityName) {
    return {
        type: 'object',
        properties: {
            data: {
                type: 'array',
                items: { $ref: `#/components/schemas/${entityName}` }
            },
            meta: {
                type: 'object',
                properties: {
                    current_page: { type: 'integer' },
                    from: { type: 'integer' },
                    last_page: { type: 'integer' },
                    per_page: { type: 'integer' },
                    to: { type: 'integer' },
                    total: { type: 'integer' },
                }
            },
            links: {
                type: 'object',
                properties: {
                    first: { type: 'string', format: 'uri' },
                    last: { type: 'string', format: 'uri' },
                    prev: { type: 'string', format: 'uri', nullable: true },
                    next: { type: 'string', format: 'uri', nullable: true },
                }
            }
        }
    };
}

// Builds CRUD paths for one entity
function buildEntityPaths(entity, relationships, enums, searchEngine) {
    const rootPath = to.slug(pluralize(entity.name));
    const tag = entity.name;
    const schemaRef = `#/components/schemas/${entity.name}`;
    const writeSchemaRef = `#/components/schemas/${entity.name}Write`;
    const paginatedSchemaRef = `#/components/schemas/${entity.name}Paginated`;

    const commonParams = [
        {
            name: 'Accept',
            in: 'header',
            required: false,
            schema: { type: 'string', default: 'application/json' }
        }
    ];

    const paths = {};

    // GET /entity + POST /entity
    paths[`/${rootPath}`] = {
        get: {
            tags: [tag],
            summary: `List ${pluralize(entity.name)}`,
            parameters: [
                ...commonParams,
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'per_page', in: 'query', schema: { type: 'integer', default: 10 } },
                { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'Field to sort by' },
                { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
                ...(searchEngine ? [{ name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full-text search query' }] : []),
            ],
            responses: {
                200: {
                    description: `Paginated list of ${pluralize(entity.name)}`,
                    content: { 'application/json': { schema: { $ref: paginatedSchemaRef } } }
                },
                401: { $ref: '#/components/responses/Unauthorized' },
                403: { $ref: '#/components/responses/Forbidden' },
            }
        },
        post: {
            tags: [tag],
            summary: `Create a new ${entity.name}`,
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { $ref: writeSchemaRef } } }
            },
            responses: {
                201: {
                    description: `${entity.name} created`,
                    content: { 'application/json': { schema: { $ref: schemaRef } } }
                },
                401: { $ref: '#/components/responses/Unauthorized' },
                403: { $ref: '#/components/responses/Forbidden' },
                422: { $ref: '#/components/responses/ValidationError' },
            }
        }
    };

    // GET /entity/{id} + PUT /entity/{id} + DELETE /entity/{id}
    const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } };
    paths[`/${rootPath}/{id}`] = {
        get: {
            tags: [tag],
            summary: `Get ${entity.name} by ID`,
            parameters: [idParam, ...commonParams],
            responses: {
                200: {
                    description: `${entity.name} found`,
                    content: { 'application/json': { schema: { $ref: schemaRef } } }
                },
                401: { $ref: '#/components/responses/Unauthorized' },
                403: { $ref: '#/components/responses/Forbidden' },
                404: { $ref: '#/components/responses/NotFound' },
            }
        },
        put: {
            tags: [tag],
            summary: `Update ${entity.name}`,
            parameters: [idParam, ...commonParams],
            requestBody: {
                required: true,
                content: { 'application/json': { schema: { $ref: writeSchemaRef } } }
            },
            responses: {
                200: {
                    description: `${entity.name} updated`,
                    content: { 'application/json': { schema: { $ref: schemaRef } } }
                },
                401: { $ref: '#/components/responses/Unauthorized' },
                403: { $ref: '#/components/responses/Forbidden' },
                404: { $ref: '#/components/responses/NotFound' },
                422: { $ref: '#/components/responses/ValidationError' },
            }
        },
        delete: {
            tags: [tag],
            summary: `Delete ${entity.name}`,
            parameters: [idParam, ...commonParams],
            responses: {
                204: { description: `${entity.name} deleted` },
                401: { $ref: '#/components/responses/Unauthorized' },
                403: { $ref: '#/components/responses/Forbidden' },
                404: { $ref: '#/components/responses/NotFound' },
            }
        }
    };

    // SoftDelete paths: trashed-entities
    if (entity.softDelete) {
        const trashedPath = `trashed-${rootPath}`;

        paths[`/${trashedPath}`] = {
            get: {
                tags: [tag],
                summary: `List trashed (soft-deleted) ${pluralize(entity.name)}`,
                parameters: [
                    ...commonParams,
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'per_page', in: 'query', schema: { type: 'integer', default: 10 } },
                ],
                responses: {
                    200: {
                        description: `Paginated list of trashed ${pluralize(entity.name)}`,
                        content: { 'application/json': { schema: { $ref: paginatedSchemaRef } } }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                }
            }
        };

        paths[`/${trashedPath}/{id}/restore`] = {
            post: {
                tags: [tag],
                summary: `Restore a soft-deleted ${entity.name}`,
                parameters: [idParam, ...commonParams],
                responses: {
                    200: {
                        description: `${entity.name} restored`,
                        content: { 'application/json': { schema: { $ref: schemaRef } } }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                }
            }
        };

        paths[`/${trashedPath}/{id}`] = {
            delete: {
                tags: [tag],
                summary: `Permanently delete a trashed ${entity.name}`,
                parameters: [idParam, ...commonParams],
                responses: {
                    204: { description: `${entity.name} permanently deleted` },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                }
            }
        };
    }

    // PessimisticLock: lock/unlock endpoints
    if (entity.pessimisticLock) {
        paths[`/${rootPath}/{id}/lock`] = {
            post: {
                tags: [tag],
                summary: `Acquire a pessimistic lock on ${entity.name}`,
                parameters: [idParam, ...commonParams],
                responses: {
                    200: { description: 'Lock acquired' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    409: { description: 'Record is already locked by another user' },
                }
            }
        };
        paths[`/${rootPath}/{id}/unlock`] = {
            post: {
                tags: [tag],
                summary: `Release a pessimistic lock on ${entity.name}`,
                parameters: [idParam, ...commonParams],
                responses: {
                    200: { description: 'Lock released' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                }
            }
        };
    }

    // serveBlob endpoint: GET /{entity}/{id}/{fieldName}/{filename}
    // Generated only when entity has at least one blob field
    const blobFields = entity.fields.filter(f => ['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type));
    for (const blobField of blobFields) {
        paths[`/${rootPath}/{id}/${to.snake(blobField.name)}/{filename}`] = {
            get: {
                tags: [tag],
                summary: `Serve binary content of ${entity.name}.${blobField.name}`,
                description: 'Returns the raw binary file (inline). Used by FileField.tsx to preview/download.',
                parameters: [
                    idParam,
                    { name: 'filename', in: 'path', required: true, schema: { type: 'string' }, description: 'Original file name (for Content-Disposition)' },
                    ...commonParams,
                ],
                responses: {
                    200: {
                        description: 'Binary file content',
                        content: { '*/*': { schema: { type: 'string', format: 'binary' } } },
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                }
            }
        };
    }

    return paths;
}

export class OpenApiGenerator {
    constructor(that) {
        this.that = that;
    }

    async generateOpenApi(entities = null, relationships = null, enums = null) {
        entities = entities ?? getEntities(this.that);
        relationships = relationships ?? getEntitiesRelationships(this.that);
        enums = enums ?? getEnums(this.that);

        const appName = this.that.config.get('name') || 'PNinja App';
        const searchEngine = this.that.config.get('searchEngine');
        const useKeycloak = this.that.config.get('authentication') === 'keycloak';

        const schemas = {};
        const paths = {};

        // Enum schemas
        for (const enm of enums) {
            schemas[enm.name] = {
                type: 'string',
                enum: enm.values.map(v => v.key),
                description: enm.values.map(v => `${v.key}: ${v.value}`).join(', '),
            };
        }

        // Entity schemas + paths
        for (const entity of entities) {
            const entityRelationships = relationships.filter(r =>
                r.entityName === entity.name || r.otherEntityName === entity.name
            );

            const { properties, required } = buildEntityProperties(entity, entityRelationships, enums);

            // Full schema (read)
            schemas[entity.name] = {
                type: 'object',
                properties,
                ...(required?.length ? { required } : {}),
            };

            // Write schema (store/update) — blob fields as nested objects
            schemas[`${entity.name}Write`] = buildWriteSchema(entity, entityRelationships, enums);

            // Paginated schema
            schemas[`${entity.name}Paginated`] = buildPaginatedSchema(entity.name);

            // Paths
            Object.assign(paths, buildEntityPaths(entity, entityRelationships, enums, searchEngine));
        }

        // user/* endpoints
        Object.assign(paths, {
            '/user/roles': {
                get: {
                    tags: ['User'],
                    summary: 'Get roles of the authenticated user',
                    responses: {
                        200: {
                            description: 'List of roles',
                            content: { 'application/json': { schema: { type: 'object', properties: { roles: { type: 'array', items: { type: 'string' } } } } } }
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                    }
                }
            },
            '/user/has-role': {
                post: {
                    tags: ['User'],
                    summary: 'Check if the authenticated user has a specific role',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['role'], properties: { role: { type: 'string' } } } } }
                    },
                    responses: {
                        200: {
                            description: 'Boolean result',
                            content: { 'application/json': { schema: { type: 'object', properties: { result: { type: 'boolean' } } } } }
                        },
                        400: { $ref: '#/components/responses/ValidationError' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                    }
                }
            },
            '/user/has-any-role': {
                post: {
                    tags: ['User'],
                    summary: 'Check if the authenticated user has any of the specified roles',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['roles'], properties: { roles: { type: 'array', items: { type: 'string' } } } } } }
                    },
                    responses: {
                        200: {
                            description: 'Boolean result',
                            content: { 'application/json': { schema: { type: 'object', properties: { result: { type: 'boolean' } } } } }
                        },
                        400: { $ref: '#/components/responses/ValidationError' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                    }
                }
            },
            '/user/has-all-roles': {
                post: {
                    tags: ['User'],
                    summary: 'Check if the authenticated user has all of the specified roles',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['roles'], properties: { roles: { type: 'array', items: { type: 'string' } } } } } }
                    },
                    responses: {
                        200: {
                            description: 'Boolean result',
                            content: { 'application/json': { schema: { type: 'object', properties: { result: { type: 'boolean' } } } } }
                        },
                        400: { $ref: '#/components/responses/ValidationError' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                    }
                }
            },
            '/user/can': {
                post: {
                    tags: ['User'],
                    summary: 'Check if the authenticated user can perform an action on a resource',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['resource', 'action'], properties: { resource: { type: 'string' }, action: { type: 'string' } } } } }
                    },
                    responses: {
                        200: {
                            description: 'Permission check result',
                            content: { 'application/json': { schema: { type: 'object', properties: { allowed: { type: 'boolean' } } } } }
                        },
                        400: { $ref: '#/components/responses/ValidationError' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                    }
                }
            },
        });

        // locks/* endpoints
        Object.assign(paths, {
            '/locks/{type}/{id}/acquire': {
                post: {
                    tags: ['Locks'],
                    summary: 'Acquire a pessimistic lock on a record',
                    parameters: [
                        { name: 'type', in: 'path', required: true, schema: { type: 'string' }, description: 'Entity type (kebab-case, e.g. ac-rules)' },
                        { name: 'id', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } },
                    ],
                    responses: {
                        200: {
                            description: 'Lock acquired',
                            content: { 'application/json': { schema: { type: 'object', properties: { acquired: { type: 'boolean', example: true }, expires_at: { type: 'string', format: 'date-time' } } } } }
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                        423: {
                            description: 'Record is already locked by another user',
                            content: { 'application/json': { schema: { type: 'object', properties: { acquired: { type: 'boolean', example: false }, locked_by: { type: 'string' }, expires_at: { type: 'string', format: 'date-time' } } } } }
                        },
                    }
                }
            },
            '/locks/{type}/{id}/renew': {
                post: {
                    tags: ['Locks'],
                    summary: 'Renew an existing pessimistic lock',
                    parameters: [
                        { name: 'type', in: 'path', required: true, schema: { type: 'string' }, description: 'Entity type (kebab-case, e.g. ac-rules)' },
                        { name: 'id', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } },
                    ],
                    responses: {
                        200: {
                            description: 'Lock renewed',
                            content: { 'application/json': { schema: { type: 'object', properties: { expires_at: { type: 'string', format: 'date-time' } } } } }
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: {
                            description: 'Lock not owned by you',
                            content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } }
                        },
                    }
                }
            },
            '/locks/{type}/{id}': {
                get: {
                    tags: ['Locks'],
                    summary: 'Get lock status for a record',
                    parameters: [
                        { name: 'type', in: 'path', required: true, schema: { type: 'string' }, description: 'Entity type (kebab-case, e.g. ac-rules)' },
                        { name: 'id', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } },
                    ],
                    responses: {
                        200: {
                            description: 'Lock status — unlocked: { locked: false }; locked by other: { locked: true, owned: false, locked_by, expires_at }; locked by self: { locked: false, owned: true, locked_by, expires_at }',
                            content: { 'application/json': { schema: { type: 'object', properties: { locked: { type: 'boolean' }, owned: { type: 'boolean' }, locked_by: { type: 'string' }, expires_at: { type: 'string', format: 'date-time' } } } } }
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                    }
                },
                delete: {
                    tags: ['Locks'],
                    summary: 'Release a pessimistic lock',
                    parameters: [
                        { name: 'type', in: 'path', required: true, schema: { type: 'string' }, description: 'Entity type (kebab-case, e.g. ac-rules)' },
                        { name: 'id', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } },
                    ],
                    responses: {
                        200: {
                            description: 'Lock released',
                            content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } }
                        },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: {
                            description: 'Forbidden',
                            content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } }
                        },
                    }
                }
            },
        });

        // auth/* endpoints
        Object.assign(paths, {
            '/auth/check-session': {
                get: {
                    tags: ['Auth'],
                    summary: 'Check if the current session is authenticated',
                    responses: {
                        200: {
                            description: 'Session status',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object', properties: {
                                            isAuthenticated: { type: 'boolean' },
                                            user: { type: 'object', nullable: true },
                                            session: {
                                                type: 'object', nullable: true, properties: {
                                                    id: { type: 'string' },
                                                    login_time: { type: 'string', nullable: true },
                                                    login_method: { type: 'string' },
                                                }
                                            },
                                            message: { type: 'string', nullable: true },
                                        }
                                    }
                                }
                            }
                        },
                    }
                }
            },
            '/auth/initiate-login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Initiate Keycloak OAuth2 login flow (PKCE)',
                    description: 'Browser/SPA flow only. Returns the Keycloak authorization URL. The user must be redirected there in a browser. For machine-to-machine use the Client Credentials flow directly against Keycloak instead.',
                    requestBody: {
                        required: false,
                        content: { 'application/json': { schema: { type: 'object', properties: { redirect_url: { type: 'string', format: 'uri' } } } } }
                    },
                    responses: {
                        200: {
                            description: 'Authorization URL to redirect the user to',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object', properties: {
                                            authUrl: { type: 'string', format: 'uri' },
                                            state: { type: 'string' },
                                        }
                                    }
                                }
                            }
                        },
                    }
                }
            },
            '/auth/callback': {
                get: {
                    tags: ['Auth'],
                    summary: 'OAuth2 callback — exchanges authorization code for session',
                    description: 'Browser/SPA flow only. Called automatically by Keycloak after user authentication. Creates a server-side session and redirects to the frontend. Not callable directly via API.',
                    parameters: [
                        { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
                    ],
                    responses: {
                        302: { description: 'Redirect to frontend with auth_success=true or error query param' },
                    }
                }
            },
            '/auth/logout': {
                post: {
                    tags: ['Auth'],
                    summary: 'Destroy the current session and return Keycloak logout URL',
                    responses: {
                        200: {
                            description: 'Session destroyed',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object', properties: {
                                            success: { type: 'boolean' },
                                            logoutUrl: { type: 'string', format: 'uri', description: 'Keycloak logout URL to redirect the user to' },
                                        }
                                    }
                                }
                            }
                        },
                    }
                }
            },
            '/auth/csrf-token': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get CSRF token',
                    responses: {
                        200: {
                            description: 'CSRF token',
                            content: { 'application/json': { schema: { type: 'object', properties: { csrf_token: { type: 'string' } } } } }
                        },
                    }
                }
            },
        });

        // Security scheme
        const securitySchemes = useKeycloak
            ? {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Keycloak JWT Bearer token'
                },
                OAuth2: {
                    type: 'oauth2',
                    'x-tokenName': 'access_token',
                    'x-clientId': '__KEYCLOAK_CLIENT_ID__',
                    flows: {
                        authorizationCode: {
                            authorizationUrl: '__KEYCLOAK_AUTH_URL__',
                            tokenUrl: '__KEYCLOAK_TOKEN_URL__',
                            scopes: {
                                openid: 'OpenID Connect scope',
                                profile: 'User profile',
                                email: 'User email',
                            }
                        }
                    }
                }
            }
            : {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            };

        // Common reusable responses
        const responses = {
            Unauthorized: {
                description: 'Authentication required',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            Forbidden: {
                description: 'Insufficient permissions',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            NotFound: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            ValidationError: {
                description: 'Validation failed',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
                    }
                }
            },
        };

        schemas.ErrorResponse = {
            type: 'object',
            properties: {
                message: { type: 'string' },
            }
        };
        schemas.ValidationErrorResponse = {
            type: 'object',
            properties: {
                message: { type: 'string' },
                errors: {
                    type: 'object',
                    additionalProperties: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            }
        };

        const openApiDoc = {
            openapi: '3.0.3',
            info: {
                title: `${appName} API`,
                version: '1.0.0',
                description: `API documentation for ${appName}, generated by generator-pninja`,
            },
            servers: [
                { url: '/api', description: 'API base path' }
            ],
            security: [{ BearerAuth: [] }, { OAuth2: ['openid', 'profile', 'email'] }],
            tags: [
                ...entities.map(e => ({ name: e.name, description: `${e.name} management` })),
                { name: 'User', description: 'Authenticated user info and permission checks' },
                { name: 'Locks', description: 'Pessimistic record locking' },
                { name: 'Auth', description: 'Authentication and session management' },
            ],
            paths,
            components: {
                schemas,
                responses,
                securitySchemes,
            }
        };

        const jsonString = JSON.stringify(openApiDoc, null, 2);

        // OpenApiController — serves openapi.json dynamically with env vars resolved
        this.that.fs.copyTpl(
            this.that.templatePath('../../server/templates/app/Http/Controllers/OpenApiController.php.ejs'),
            this.that.destinationPath('server/app/Http/Controllers/OpenApiController.php'),
            {}
        );

        // OAuth2 redirect page for Keycloak auth code flow (used by Swagger UI's "Authorize" button)
        this.that.fs.copyTpl(
            this.that.templatePath('../../client/templates/react/public/oauth2-redirect.html'),
            this.that.destinationPath('client/public/oauth2-redirect.html'),
            {}
        );

        // Served dynamically by OpenApiController which replaces
        // __KEYCLOAK_*__ placeholders with real .env values at runtime
        this.that.fs.write(
            this.that.destinationPath('server/resources/openapi.json'),
            jsonString
        );
    }
}