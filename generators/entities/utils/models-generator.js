import to from 'to-case';
import pluralize from 'pluralize';
export class ModelsGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = that.fs.readJSON(that.destinationPath('.pninja/Entities.json'));
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateModels() {
        const { enums, entities, relationships } = this.parsedJDL;
        const searchEngine = this.that.config.get('searchEngine');
        if (this.that.config.get('authentication') === 'keycloak') {
            this.that.fs.copyTpl(this.that.templatePath("app/Resolvers/Keycloak__UserResolver.php.ejs"), this.that.destinationPath(`server/app/Resolvers/UserResolver.php`));
        }
        this.that.fs.copyTpl(this.that.templatePath("app/Models/AcRule.php.ejs"), this.that.destinationPath(`server/app/Models/AcRule.php`));
        for (const entity of entities) {
            const className = entity.name;
            const tableName = to.snake(pluralize(entity.tableName));
            // fillable from entity property
            const fillable = entity.body.reduce((acc, prop) => {
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
            const blobs = entity.body.reduce((acc, prop) => {
                if (['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                    acc.push(`'${to.snake(prop.name)}_blob'`);
                }
                return acc;
            }, []);
            // blob columns from entity property
            const booleans = entity.body.reduce((acc, prop) => {
                if (prop.type === 'Boolean') {
                    acc.push(`'${to.snake(prop.name)}'`);
                }
                return acc;
            }, []);
            // toSearchableArray from entity property
            const toSearchableArray = entity.body.reduce((acc, prop) => {
                if (!['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                    acc.push(`${to.snake(prop.name)}`);
                }
                return acc;
            }, []);
            const toSearchableArrayTypes = entity.body.reduce((acc, prop) => {
                if (!['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
                    acc[`${to.snake(prop.name)}`] = prop.type;
                }
                return acc;
            }, {});
            const relationsType = [];
            const relations = [];
            relationships.filter(relation => (
                relation.cardinality === 'OneToMany' && relation.to.name === entity.name
            )).forEach(relation => {
                fillable.push(`'${to.snake(relation.to.injectedField || relation.from.name)}_id'`);
            });
            relationships.filter(relation => (
                (relation.cardinality === 'OneToOne' || relation.cardinality === 'ManyToOne') && relation.from.name === entity.name
            )).forEach(relation => {
                fillable.push(`'${to.snake(relation.from.injectedField || relation.to.name)}_id'`);
            });

            // OneToOne direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('BelongsTo');
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): BelongsTo { return $this->belongsTo(${relation.to.name}::class, '${to.snake(relation.from.injectedField || relation.to.name)}_id'); }`);
            });

            // OneToOne reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('HasOne');
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): HasOne { return $this->hasOne(${relation.from.name}::class, '${to.snake(relation.from.injectedField || relation.to.name)}_id'); }`);
            });

            // OneToMany direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToMany' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('HasMany');
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): HasMany { return $this->hasMany(${relation.to.name}::class, '${to.snake(relation.to.injectedField || relation.from.name)}_id'); }`);
            });

            // OneToMany reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToMany' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('BelongsTo');
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): BelongsTo { return $this->belongsTo(${relation.from.name}::class, '${to.snake(relation.to.injectedField || relation.from.name)}_id'); }`);
            });

            // ManyToOne direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('BelongsTo');
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): BelongsTo { return $this->belongsTo(${relation.to.name}::class, '${to.snake(relation.from.injectedField || relation.to.name)}_id'); }`);
            });

            // ManyToOne reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('HasMany');
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): HasMany { return $this->hasMany(${relation.from.name}::class, '${to.snake(relation.from.injectedField || relation.to.name)}_id'); }`);
            });

            // ManyToMany direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('BelongsToMany');
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): BelongsToMany { return $this->belongsToMany(${relation.to.name}::class, '${[to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_')}', '${to.snake(relation.to.injectedField || relation.from.name)}_id', '${to.snake(relation.from.injectedField || relation.to.name)}_id')->withTimestamps(); }`);
            });

            // ManyToMany reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relationsType.push('BelongsToMany');
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): BelongsToMany { return $this->belongsToMany(${relation.from.name}::class, '${[to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_')}', '${to.snake(relation.from.injectedField || relation.to.name)}_id', '${to.snake(relation.to.injectedField || relation.froom.name)}_id')->withTimestamps(); }`);
            });

            const castsClasses = enums.filter(e => entity.body.map(f => f.type).includes(e.name)).map(e => {
                return {
                    attrsName: entity.body.filter(f => f.type === e.name).map(f => to.snake(f.name)),
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

            const enumsInEntity = enums.filter(e => entity.body.map(f => f.type).includes(e.name)).map(e => e.name);
            const enumColumns = entity.body.filter(f => enumsInEntity.includes(f.type)).map(f => to.snake(f.name));
            const typesenseSearchParameters = searchEngine === 'typesense' ? `
    public function typesenseSearchParameters(): array
    {
        return [
            'query_by' => '${entity.body.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => to.snake(f.name)).join(",")}',
            'prefix' => '${entity.body.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => ['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'true' : 'false').join(",")}',
            'infix' => '${entity.body.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => ['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'always' : 'off').join(",")}',
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