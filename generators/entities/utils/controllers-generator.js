import to from 'to-case';
import pluralize from 'pluralize';
import { getWits } from '../../utils/getWiths.js';

const getValidations = (e, relationships, op) => {
    const entity = structuredClone(e);
    return {
        ...entity.body
            .map(field => {
                const { validations } = field;
                if (field.type === 'UUID') field.validations.unshift({ key: 'pattern', value: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' });
                if (!validations.reduce((itsRequired, validation) => { return itsRequired || validation.key === 'required' }, false)) {
                    field.validations.unshift({ key: 'nullable', value: '' });
                }
                if (['String', 'UUID'].includes(field.type)) field.validations.unshift({ key: 'fieldType', value: 'string' });
                if (['BigDecimal', 'Double', 'Float', 'Integer', 'Long'].includes(field.type)) field.validations.unshift({ key: 'fieldType', value: 'numeric' });
                if (field.type === 'Boolean') field.validations.unshift({ key: 'fieldType', value: 'boolean' });
                return field;
            })
            .reduce((acc, field) => {
                const { name, validations } = field;
                acc[to.snake(name)] = validations.map(({ key, value }) => {
                    if (key === 'required') {
                        return `'required'`;
                    }
                    if (key === 'nullable') {
                        return `'nullable'`;
                    }
                    if (key === 'unique' && op === 'store') {
                        return `'unique:${to.snake(pluralize(entity.tableName))},${to.snake(name)}'`;
                    }
                    if (key === 'unique' && op === 'update') {
                        return `Rule::unique('${to.snake(pluralize(entity.tableName))}', '${to.snake(name)}')->ignore($${to.camel(entity.name)}->id)`;
                    }
                    if (key === 'fieldType') {
                        return `'${value}'`;
                    }
                    if (key === 'minlength' || key === 'min') {
                        return `'min:${value}'`;
                    }
                    if (key === 'maxlength' || key === 'max') {
                        return `'max:${value}'`;
                    }
                    if (key === 'minbytes') {
                        return `'base64_min_size:${value}'`;
                    }
                    if (key === 'maxbytes') {
                        return `'base64_max_size:${value}'`;
                    }
                    if (key === 'pattern') {
                        return `'regex:\/${value}\/'`;
                    }
                });
                return acc;
            }, {}),
        ...relationships
            .filter(relation => relation.cardinality === 'OneToOne' && relation.from.name === entity.name) // OneToOne Relations [--->]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(
                    relation.from.injectedField || relation.to.name
                );
                const toInjectedField = to.snake(
                    relation.to.injectedField || relation.from.name
                );
                const fromTabName = pluralize(to.snake(relation.from.name));
                const toTabName = pluralize(to.snake(relation.to.name));
                const foreignId = `${fromInjectedField}_id`;
                const unique = true;
                const nullable = !relation.from.required;
                acc[foreignId] = [`Rule::exists('${toTabName}', 'id')`];
                if (nullable) acc[foreignId].push(`'nullable'`);
                if (!nullable) acc[foreignId].push(`'required'`);
                if (unique && op === 'store') acc[foreignId].push(`'unique:${to.snake(pluralize(entity.tableName))},${foreignId}'`);
                if (unique && op === 'update') acc[foreignId].push(`Rule::unique('${fromTabName}', '${foreignId}')->ignore($${to.camel(entity.name)}->id)`);
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.cardinality === 'OneToMany' && relation.to.name === entity.name)) // OneToMany Relations [<---]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                const fromTabName = pluralize(to.snake(relation.from.name));
                const toTabName = pluralize(to.snake(relation.to.name));
                const foreignId = `${toInjectedField}_id`;
                const unique = false;
                const nullable = !relation.to.required;
                acc[foreignId] = [`Rule::exists('${fromTabName}', 'id')`];
                if (nullable) acc[foreignId].push(`'nullable'`);
                if (!nullable) acc[foreignId].push(`'required'`);
                if (unique && op === 'store') acc[foreignId].push(`'unique:${to.snake(pluralize(entity.tableName))},${foreignId}'`);
                if (unique && op === 'update') acc[foreignId].push(`Rule::unique('${fromTabName}', '${foreignId}')->ignore($${to.camel(entity.name)}->id)`);
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.cardinality === 'ManyToOne' && relation.from.name === entity.name)) // ManyToOne Relations [--->]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                const fromTabName = pluralize(to.snake(relation.from.name));
                const toTabName = pluralize(to.snake(relation.to.name));
                const foreignId = `${fromInjectedField}_id`;
                const unique = false;
                const nullable = !relation.from.required;
                acc[foreignId] = [`Rule::exists('${toTabName}', 'id')`];
                if (nullable) acc[foreignId].push(`'nullable'`);
                if (!nullable) acc[foreignId].push(`'required'`);
                if (unique && op === 'store') acc[foreignId].push(`'unique:${to.snake(pluralize(entity.tableName))},${foreignId}'`);
                if (unique && op === 'update') acc[foreignId].push(`Rule::unique('${fromTabName}', '${foreignId}')->ignore($${to.camel(entity.name)}->id)`);
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.cardinality === 'ManyToMany' && relation.to.name === entity.name)) // ManyToMany Relations [<---]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                const fromTabName = pluralize(to.snake(relation.from.name));
                const toTabName = pluralize(to.snake(relation.to.name));
                const foreignId = `${toInjectedField}_id`;
                const unique = false;
                const nullable = !relation.to.required;
                acc[toInjectedField] = [`'array'`];
                if (nullable) acc[toInjectedField].push(`'sometimes'`);
                if (!nullable) acc[toInjectedField].push(`'required'`);
                if (!nullable) acc[toInjectedField].push(`'min:1'`);
                acc[`${toInjectedField}.*`] = [`'integer'`, `'exists:${fromTabName},id'`];
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.cardinality === 'ManyToMany' && relation.from.name === entity.name)) // ManyToMany Relations [--->]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                const fromTabName = pluralize(to.snake(relation.from.name));
                const toTabName = pluralize(to.snake(relation.to.name));
                const foreignId = `${fromInjectedField}_id`;
                const unique = false;
                const nullable = !relation.from.required;
                acc[fromInjectedField] = [`'array'`];
                if (nullable) acc[fromInjectedField].push(`'sometimes'`);
                if (!nullable) acc[fromInjectedField].push(`'required'`);
                if (!nullable) acc[fromInjectedField].push(`'min:1'`);
                acc[`${fromInjectedField}.*`] = [`'integer'`, `'exists:${toTabName},id'`];
                return acc;
            }, {}),
    };
}

export class ControllersGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = that.fs.readJSON(that.destinationPath('.pninja/Entities.json'));
    }
    generateControllers() {
        const { enums, entities, relationships } = this.parsedJDL;
        const searchEngine = this.that.config.get('searchEngine');

        this.that.fs.copyTpl(this.that.templatePath("ApiErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/ApiErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("NotFoundErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/NotFoundErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("DatabaseErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/DatabaseErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("ValidationErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/ValidationErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("Providers/AppServiceProvider.php.ejs"), this.that.destinationPath(`server/app/Providers/AppServiceProvider.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("Casts/Base64BinaryCast.php.ejs"), this.that.destinationPath(`server/app/Casts/Base64BinaryCast.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("Rules/Base64MaxSize.php.ejs"), this.that.destinationPath(`server/app/Rules/Base64MaxSize.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("Rules/Base64MinSize.php.ejs"), this.that.destinationPath(`server/app/Rules/Base64MinSize.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("HandlesApiErrors.php.ejs"), this.that.destinationPath(`server/app/Traits/HandlesApiErrors.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("HandlesUserRoles.php.ejs"), this.that.destinationPath(`server/app/Traits/HandlesUserRoles.php`));

        for (const entity of entities) {
            const withs = getWits(entity, relationships);
            const createRelated = [];
            relationships.forEach(relation => {
                if (!relation.from.injectedField && !relation.to.injectedField) {
                    relation.to.injectedField = relation.from.name;
                    relation.from.injectedField = relation.to.name;
                }
                return relation;
            })

            // ManyToMany direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany'
                && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                const fromField = to.snake(relation.from.injectedField || relation.to.name);
                const toEntity = relation.to.name;
                if (relation.cardinality === 'ManyToMany') {
                    createRelated.push(`\n            if(array_key_exists("${fromField}", $validated)) {
                $${to.camel(entity.name)}->${fromField}()->sync($validated['${fromField}']);
            }\n`);
                }
            });

            // ManyToMany reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany'
                && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                const toField = to.snake(relation.to.injectedField || relation.from.name);
                const fromEntity = relation.from.name;
                if (relation.cardinality === 'ManyToMany') {
                    createRelated.push(`\n            if(array_key_exists("${toField}", $validated)) {
                $${to.camel(entity.name)}->${toField}()->sync($validated['${toField}']);
            }\n`);
                }
            });

            const relatedEntitiesForFilters = relationships.filter(relation =>
                relation.cardinality === 'OneToOne'
                && relation.to.name === entity.name
            ).map(rel => {
                return {
                    name: rel.from.name,
                    injectedField: rel.from.injectedField || rel.to.name,
                };
            });

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

            this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/AcRuleController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/AcRuleController.php`), {});
            this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/EntityController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/${entity.name}Controller.php`),
                {
                    className: entity.name,
                    entityName: to.camel(entity.name),
                    validationsStore: getValidations(entity, relationships, 'store'),
                    validationsUpdate: getValidations(entity, relationships, 'update'),
                    fileFields: entity.body.filter(field => field.type === 'Blob' || field.type === 'AnyBlob' || field.type === 'ImageBlob').map(field => to.snake(field.name)),
                    imageFields: entity.body.filter(field => field.type === 'ImageBlob').map(field => to.snake(field.name)),
                    booleanFields: entity.body.filter(field => field.type === 'Boolean').map(field => to.snake(field.name)),
                    withs: withs.length ? `[${withs.join(', ')}]` : null,
                    createRelated: createRelated.join(''),
                    relatedEntitiesForFilters,
                    searchEngine,
                    to,
                    getSolrSuffix,
                    toSearchableArray,
                    toSearchableArrayTypes,
                });
            this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/FileController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/FileController.php`), {});
            this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/KeycloakProxyController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/KeycloakProxyController.php`), {});
            this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/ScoutQuerySanitizer.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/ScoutQuerySanitizer.php`), {});
            this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/SessionAuthController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/SessionAuthController.php`), {});
        }
    }
}