import to from 'to-case';
import pluralize from 'pluralize';
import { AcRule } from '../../utils/AcRule.js';
import { getEntities, getEntitiesRelationships, getEnums } from '../../utils/getEntities.js';
export class ModelsGenerator {
    constructor(that) {
        this.that = that;
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateModel(entity, enums, relationships, searchEngine) {
        const hasSoftDelete = !!entity.softDelete;
        const className = entity.name;
        const tableName = to.snake(pluralize(entity.tableName));
        // fillable from entity property
        const fillable = entity.fields.reduce((acc, prop) => {
            if (prop.type !== 'Blob' && prop.type !== 'AnyBlob' && prop.type !== 'ImageBlob') {
                acc.push(`'${to.snake(prop.name)}'`);
            } else {
                acc.push(`'${to.snake(prop.name)}_blob'`);
                acc.push(`'${to.snake(prop.name)}_type'`);
                acc.push(`'${to.snake(prop.name)}_name'`);
            }
            return acc;
        }, []);
        // blob columns from entity property
        const blobs = entity.fields.reduce((acc, prop) => {
            if (['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                acc.push(`'${to.snake(prop.name)}_blob'`);
            }
            return acc;
        }, []);
        // blob columns from entity property
        const booleans = entity.fields.reduce((acc, prop) => {
            if (prop.type === 'Boolean') {
                acc.push(`'${to.snake(prop.name)}'`);
            }
            return acc;
        }, []);
        // toSearchableArray from entity property
        const toSearchableArray = entity.fields.reduce((acc, prop) => {
            if (!['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                acc.push(`${to.snake(prop.name)}`);
            }
            return acc;
        }, []);
        const toSearchableArrayTypes = entity.fields.reduce((acc, prop) => {
            if (!['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                acc[`${to.snake(prop.name)}`] = prop.type;
            }
            return acc;
        }, {});
        const relationsType = [];
        const relations = [];
        relationships.filter(relation => (
            relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name
        )).forEach(relation => {
            fillable.push(`'${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id'`);
        });
        relationships.filter(relation => (
            (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one') && relation.entityName === entity.name
        )).forEach(relation => {
            fillable.push(`'${to.snake(relation.relationshipName || relation.otherEntityName)}_id'`);
        });

        // one-to-one direct relationships
        relationships.filter(relation => (
            relation.relationshipType === 'one-to-one' && relation.entityName === entity.name
        )).forEach(relation => {
            relationsType.push('BelongsTo');
            relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): BelongsTo { return $this->belongsTo(${relation.otherEntityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
        });

        // one-to-one reverse relationships
        relationships.filter(relation => (
            relation.bidirectional && relation.relationshipType === 'one-to-one' && relation.otherEntityName === entity.name
        )).forEach(relation => {
            relationsType.push('HasOne');
            relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): HasOne { return $this->hasOne(${relation.entityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
        });

        // one-to-many direct relationships
        relationships.filter(relation => (
            relation.relationshipType === 'one-to-many' && relation.entityName === entity.name
            && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            relationsType.push('HasMany');
            relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): HasMany { return $this->hasMany(${relation.otherEntityName}::class, '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id'); }`);
        });

        // one-to-many reverse relationships
        relationships.filter(relation => (
            relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name
            && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            relationsType.push('BelongsTo');
            relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): BelongsTo { return $this->belongsTo(${relation.entityName}::class, '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id'); }`);
        });

        // many-to-one direct relationships
        relationships.filter(relation => (
            relation.relationshipType === 'many-to-one' && relation.entityName === entity.name
            && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            relationsType.push('BelongsTo');
            relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): BelongsTo { return $this->belongsTo(${relation.otherEntityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
        });

        // many-to-one reverse relationships
        relationships.filter(relation => (
            relation.relationshipType === 'many-to-one' && relation.otherEntityName === entity.name
            && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            relationsType.push('HasMany');
            relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): HasMany { return $this->hasMany(${relation.entityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
        });

        // many-to-many direct relationships
        relationships.filter(relation => (
            relation.relationshipType === 'many-to-many' && relation.entityName === entity.name
            && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            relationsType.push('BelongsToMany');
            relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): BelongsToMany { return $this->belongsToMany(${relation.otherEntityName}::class, '${[to.snake(relation.entityName), to.snake(relation.otherEntityName)].sort().join('_')}', '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id', '${to.snake(relation.relationshipName || relation.otherEntityName)}_id')->withTimestamps(); }`);
        });

        // many-to-many reverse relationships
        relationships.filter(relation => (
            relation.relationshipType === 'many-to-many' && relation.otherEntityName === entity.name
            && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            relationsType.push('BelongsToMany');
            relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): BelongsToMany { return $this->belongsToMany(${relation.entityName}::class, '${[to.snake(relation.entityName), to.snake(relation.otherEntityName)].sort().join('_')}', '${to.snake(relation.relationshipName || relation.otherEntityName)}_id', '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id')->withTimestamps(); }`);
        });

        const castsClasses = enums.filter(e => entity.fields.map(f => f.type).includes(e.name)).map(e => {
            return {
                attrsName: entity.fields.filter(f => f.type === e.name).map(f => to.snake(f.name)),
                className: e.name
            }
        });
        const castsB64 = blobs.map(c => ({
            attrsName: [c.replace(/'/g, '')],
            className: 'Base64BinaryCast'
        }));
        const castsBoolean = booleans.map(c => ({
            attrsName: [c.replace(/'/g, '')],
            cast: 'boolean'
        }));

        const getSolrSuffix = (type) => {
            switch (type) {
                case 'String':
                case 'UUID':
                    return '_s';
                case 'TextBlob':
                    return '_t';
                case 'Integer':
                case 'Long':
                    return '_i';
                case 'Float':
                case 'Double':
                case 'BigDecimal':
                    return '_d';
                case 'LocalDate':
                    return '_dt';
                case 'ZonedDateTime':
                case 'Instant':
                    return '_dt';
                case 'Duration':
                    return '_l';
                case 'LocalTime':
                    return '_t';
                case 'Boolean':
                    return '_b';
                default:
                    return '_s';
            }
        }

        const enumsInEntity = enums.filter(e => entity.fields.map(f => f.type).includes(e.name)).map(e => e.name);
        const enumColumns = entity.fields.filter(f => enumsInEntity.includes(f.type)).map(f => to.snake(f.name));
        const typesenseSearchParameters = searchEngine === 'typesense' ? `
public function typesenseSearchParameters(): array
{
    return [
        'query_by' => '${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => to.snake(f.name)).join(",")}',
        'prefix' => '${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => ['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'true' : 'false').join(",")}',
        'infix' => '${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => ['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'always' : 'off').join(",")}',
    ];
}` : '';
        this.that.fs.copyTpl(this.that.templatePath("app/Models/Entity.php.ejs"), this.that.destinationPath(`server/app/Models/${className}.php`),
            {
                className,
                tableName,
                hasBlobs: blobs.length > 0,
                fillable: fillable.join(",\n" + this.tab(2)),
                hidden: blobs.join(", "),
                toSearchableArray,
                toSearchableArrayTypes,
                relations: relations.join(`\n${this.tab(1)}`),
                relationsType: [...new Set(relationsType)],
                enums: enumsInEntity,
                enumColumns,
                castsClasses: [...castsClasses, ...castsB64],
                casts: [...castsBoolean],
                searchEngine,
                typesenseSearchParameters,
                getSolrSuffix,
                hasSoftDelete,
            });
    }

    generateModels() {
        const entities = getEntities(this.that);
        const enums = getEnums(this.that);
        const relationships = getEntitiesRelationships(this.that);
        const searchEngine = this.that.config.get('searchEngine');
        if (this.that.config.get('authentication') === 'keycloak') {
            this.that.fs.copyTpl(this.that.templatePath("app/Resolvers/Keycloak__UserResolver.php.ejs"), this.that.destinationPath(`server/app/Resolvers/UserResolver.php`));
        }
        for (const entity of [AcRule, ...entities]) {
            this.generateModel(entity, enums, relationships, searchEngine);
        }
        if (false) for (const entity of [AcRule, ...entities]) {
            const hasSoftDelete = !!entity.softDelete;
            const className = entity.name;
            const tableName = to.snake(pluralize(entity.tableName));
            // fillable from entity property
            const fillable = entity.fields.reduce((acc, prop) => {
                if (prop.type !== 'Blob' && prop.type !== 'AnyBlob' && prop.type !== 'ImageBlob') {
                    acc.push(`'${to.snake(prop.name)}'`);
                } else {
                    acc.push(`'${to.snake(prop.name)}_blob'`);
                    acc.push(`'${to.snake(prop.name)}_type'`);
                    acc.push(`'${to.snake(prop.name)}_name'`);
                }
                return acc;
            }, []);
            // blob columns from entity property
            const blobs = entity.fields.reduce((acc, prop) => {
                if (['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                    acc.push(`'${to.snake(prop.name)}_blob'`);
                }
                return acc;
            }, []);
            // blob columns from entity property
            const booleans = entity.fields.reduce((acc, prop) => {
                if (prop.type === 'Boolean') {
                    acc.push(`'${to.snake(prop.name)}'`);
                }
                return acc;
            }, []);
            // toSearchableArray from entity property
            const toSearchableArray = entity.fields.reduce((acc, prop) => {
                if (!['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                    acc.push(`${to.snake(prop.name)}`);
                }
                return acc;
            }, []);
            const toSearchableArrayTypes = entity.fields.reduce((acc, prop) => {
                if (!['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                    acc[`${to.snake(prop.name)}`] = prop.type;
                }
                return acc;
            }, {});
            const relationsType = [];
            const relations = [];
            relationships.filter(relation => (
                relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name
            )).forEach(relation => {
                fillable.push(`'${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id'`);
            });
            relationships.filter(relation => (
                (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one') && relation.entityName === entity.name
            )).forEach(relation => {
                fillable.push(`'${to.snake(relation.relationshipName || relation.otherEntityName)}_id'`);
            });

            // one-to-one direct relationships
            relationships.filter(relation => (
                relation.relationshipType === 'one-to-one' && relation.entityName === entity.name
                && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('BelongsTo');
                relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): BelongsTo { return $this->belongsTo(${relation.otherEntityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
            });

            // one-to-one reverse relationships
            relationships.filter(relation => (
                relation.relationshipType === 'one-to-one' && relation.otherEntityName === entity.name
                && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('HasOne');
                relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): HasOne { return $this->hasOne(${relation.entityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
            });

            // one-to-many direct relationships
            relationships.filter(relation => (
                relation.relationshipType === 'one-to-many' && relation.entityName === entity.name
                && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('HasMany');
                relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): HasMany { return $this->hasMany(${relation.otherEntityName}::class, '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id'); }`);
            });

            // one-to-many reverse relationships
            relationships.filter(relation => (
                relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name
                && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('BelongsTo');
                relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): BelongsTo { return $this->belongsTo(${relation.entityName}::class, '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id'); }`);
            });

            // many-to-one direct relationships
            relationships.filter(relation => (
                relation.relationshipType === 'many-to-one' && relation.entityName === entity.name
                && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('BelongsTo');
                relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): BelongsTo { return $this->belongsTo(${relation.otherEntityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
            });

            // many-to-one reverse relationships
            relationships.filter(relation => (
                relation.relationshipType === 'many-to-one' && relation.otherEntityName === entity.name
                && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('HasMany');
                relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): HasMany { return $this->hasMany(${relation.entityName}::class, '${to.snake(relation.relationshipName || relation.otherEntityName)}_id'); }`);
            });

            // many-to-many direct relationships
            relationships.filter(relation => (
                relation.relationshipType === 'many-to-many' && relation.entityName === entity.name
                && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('BelongsToMany');
                relations.push(`public function ${to.snake(relation.relationshipName || relation.otherEntityName)}(): BelongsToMany { return $this->belongsToMany(${relation.otherEntityName}::class, '${[to.snake(relation.entityName), to.snake(relation.otherEntityName)].sort().join('_')}', '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id', '${to.snake(relation.relationshipName || relation.otherEntityName)}_id')->withTimestamps(); }`);
            });

            // many-to-many reverse relationships
            relationships.filter(relation => (
                relation.relationshipType === 'many-to-many' && relation.otherEntityName === entity.name
                && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
            )).forEach(relation => {
                relationsType.push('BelongsToMany');
                relations.push(`public function ${to.snake(relation.otherEntityRelationshipName || relation.entityName)}(): BelongsToMany { return $this->belongsToMany(${relation.entityName}::class, '${[to.snake(relation.entityName), to.snake(relation.otherEntityName)].sort().join('_')}', '${to.snake(relation.relationshipName || relation.otherEntityName)}_id', '${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id')->withTimestamps(); }`);
            });

            const castsClasses = enums.filter(e => entity.fields.map(f => f.type).includes(e.name)).map(e => {
                return {
                    attrsName: entity.fields.filter(f => f.type === e.name).map(f => to.snake(f.name)),
                    className: e.name
                }
            });
            const castsB64 = blobs.map(c => ({
                attrsName: [c.replace(/'/g, '')],
                className: 'Base64BinaryCast'
            }));
            const castsBoolean = booleans.map(c => ({
                attrsName: [c.replace(/'/g, '')],
                cast: 'boolean'
            }));

            const getSolrSuffix = (type) => {
                switch (type) {
                    case 'String':
                    case 'UUID':
                        return '_s';
                    case 'TextBlob':
                        return '_t';
                    case 'Integer':
                    case 'Long':
                        return '_i';
                    case 'Float':
                    case 'Double':
                    case 'BigDecimal':
                        return '_d';
                    case 'LocalDate':
                        return '_dt';
                    case 'ZonedDateTime':
                    case 'Instant':
                        return '_dt';
                    case 'Duration':
                        return '_l';
                    case 'LocalTime':
                        return '_t';
                    case 'Boolean':
                        return '_b';
                    default:
                        return '_s';
                }
            }

            const enumsInEntity = enums.filter(e => entity.fields.map(f => f.type).includes(e.name)).map(e => e.name);
            const enumColumns = entity.fields.filter(f => enumsInEntity.includes(f.type)).map(f => to.snake(f.name));
            const typesenseSearchParameters = searchEngine === 'typesense' ? `
    public function typesenseSearchParameters(): array
    {
        return [
            'query_by' => '${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => to.snake(f.name)).join(",")}',
            'prefix' => '${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => ['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'true' : 'false').join(",")}',
            'infix' => '${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => ['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'always' : 'off').join(",")}',
        ];
    }` : '';
            this.that.fs.copyTpl(this.that.templatePath("app/Models/Entity.php.ejs"), this.that.destinationPath(`server/app/Models/${className}.php`),
                {
                    className,
                    tableName,
                    hasBlobs: blobs.length > 0,
                    fillable: fillable.join(",\n" + this.tab(2)),
                    hidden: blobs.join(", "),
                    toSearchableArray,
                    toSearchableArrayTypes,
                    relations: relations.join(`\n${this.tab(1)}`),
                    relationsType: [...new Set(relationsType)],
                    enums: enumsInEntity,
                    enumColumns,
                    castsClasses: [...castsClasses, ...castsB64],
                    casts: [...castsBoolean],
                    searchEngine,
                    typesenseSearchParameters,
                    getSolrSuffix,
                    hasSoftDelete,
                });
        }
        for (const enm of enums) {
            this.that.fs.copyTpl(this.that.templatePath("Enum.php.ejs"), this.that.destinationPath(`server/app/Enums/${enm.name}.php`), {
                name: enm.name,
                values: enm.values,
            })
        }
    }
}