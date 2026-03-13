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
            return { type: 'string', format: 'byte', description: 'Base64 encoded binary content' };
        default:
            // Could be an enum
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

// Builds the schema properties for an entity (fields + FK ids from relationships)
function buildEntityProperties(entity, relationships, enums) {
    const properties = {
        id: { type: 'integer', format: 'int64', readOnly: true }
    };
    const required = [];

    for (const field of entity.fields) {
        const isBlob = ['Blob', 'AnyBlob', 'ImageBlob'].includes(field.type);
        const isRequired = field.validations.some(v => v.key === 'required');

        if (isBlob) {
            // Blobs are split into _blob, _type, _name
            properties[`${to.snake(field.name)}_blob`] = applyValidations(
                { type: 'string', format: 'byte', description: 'Base64 encoded binary content' },
                field.validations,
                field.type
            );
            properties[`${to.snake(field.name)}_type`] = { type: 'string', description: 'MIME type of the binary content' };
            properties[`${to.snake(field.name)}_name`] = { type: 'string', description: 'File name of the binary content' };
            if (isRequired) {
                required.push(`${to.snake(field.name)}_blob`);
                required.push(`${to.snake(field.name)}_type`);
                required.push(`${to.snake(field.name)}_name`);
            }
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

// Builds a "WriteRequest" schema (no id, no readOnly) for store/update
function buildWriteSchema(entityName, readSchema) {
    const { id, ...writeProperties } = readSchema.properties;
    return {
        type: 'object',
        properties: writeProperties,
        required: readSchema.required?.length ? readSchema.required : undefined,
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

    return paths;
}

export class SwaggerGenerator {
    constructor(that) {
        this.that = that;
    }

    async generateSwagger(entities = null, relationships = null, enums = null) {
        entities = entities ?? getEntities(this.that);
        relationships = relationships ?? getEntitiesRelationships(this.that);
        enums = enums ?? getEnums(this.that);

        const appName = this.that.config.get('name') || 'PNinja App';
        const searchEngine = this.that.config.get('searchEngine');
        const useKeycloak = !!this.that.config.get('keycloak');

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

            // Write schema (store/update)
            schemas[`${entity.name}Write`] = buildWriteSchema(entity.name, schemas[entity.name]);

            // Paginated schema
            schemas[`${entity.name}Paginated`] = buildPaginatedSchema(entity.name);

            // Paths
            Object.assign(paths, buildEntityPaths(entity, entityRelationships, enums, searchEngine));
        }

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
                    flows: {
                        authorizationCode: {
                            authorizationUrl: '{keycloakUrl}/auth',
                            tokenUrl: '{keycloakUrl}/token',
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
            security: [{ BearerAuth: [] }],
            tags: entities.map(e => ({ name: e.name, description: `${e.name} management` })),
            paths,
            components: {
                schemas,
                responses,
                securitySchemes,
            }
        };

        const jsonString = JSON.stringify(openApiDoc, null, 2);

        // // YAML via js-yaml if available, otherwise fall back to JSON (both are valid OpenAPI)
        // let yamlString;
        // try {
        //     const { default: yaml } = await import('js-yaml');
        //     yamlString = yaml.dump(openApiDoc, { lineWidth: 120, noRefs: false });
        // } catch (e) {
        //     yamlString = jsonString;
        // }

        // this.that.fs.copyTpl(
        //     this.that.templatePath("openapi.yaml.ejs"),
        //     this.that.destinationPath(`client/public/openapi.yaml`),
        //     { openApiDoc: yamlString }
        // );

        this.that.fs.write(
            this.that.destinationPath(`client/public/openapi.json`),
            jsonString
        );
    }
}