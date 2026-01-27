import to from 'to-case';
import pluralize from 'pluralize';
import { getWits } from '../../utils/getWiths.js';
import { AcRule } from '../../utils/AcRule.js';
import { getEntities, getEntitiesRelationships } from '../../utils/getEntities.js';

const getValidations = (e, relationships, op) => {
    const entity = structuredClone(e);
    return {
        ...entity.fields
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
            .filter(relation => relation.relationshipType === 'one-to-one' && relation.entityName === entity.name) // one-to-one Relations [--->]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(
                    relation.relationshipName || relation.otherEntityName
                );
                const toInjectedField = to.snake(
                    relation.otherEntityRelationshipName || relation.entityName
                );
                const fromTabName = pluralize(to.snake(relation.entityName));
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const foreignId = `${fromInjectedField}_id`;
                const unique = true;
                const nullable = !relation.relationshipRequired;
                acc[foreignId] = [`Rule::exists('${toTabName}', 'id')`];
                if (nullable) acc[foreignId].push(`'nullable'`);
                if (!nullable) acc[foreignId].push(`'required'`);
                if (unique && op === 'store') acc[foreignId].push(`'unique:${to.snake(pluralize(entity.tableName))},${foreignId}'`);
                if (unique && op === 'update') acc[foreignId].push(`Rule::unique('${fromTabName}', '${foreignId}')->ignore($${to.camel(entity.name)}->id)`);
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name)) // one-to-many Relations [<---]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
                const toInjectedField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
                const fromTabName = pluralize(to.snake(relation.entityName));
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const foreignId = `${toInjectedField}_id`;
                const unique = false;
                const nullable = !relation.inverseRelationshipRequired;
                acc[foreignId] = [`Rule::exists('${fromTabName}', 'id')`];
                if (nullable) acc[foreignId].push(`'nullable'`);
                if (!nullable) acc[foreignId].push(`'required'`);
                if (unique && op === 'store') acc[foreignId].push(`'unique:${to.snake(pluralize(entity.tableName))},${foreignId}'`);
                if (unique && op === 'update') acc[foreignId].push(`Rule::unique('${fromTabName}', '${foreignId}')->ignore($${to.camel(entity.name)}->id)`);
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.relationshipType === 'many-to-one' && relation.entityName === entity.name)) // many-to-one Relations [--->]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
                const toInjectedField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
                const fromTabName = pluralize(to.snake(relation.entityName));
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const foreignId = `${fromInjectedField}_id`;
                const unique = false;
                const nullable = !relation.relationshipRequired;
                acc[foreignId] = [`Rule::exists('${toTabName}', 'id')`];
                if (nullable) acc[foreignId].push(`'nullable'`);
                if (!nullable) acc[foreignId].push(`'required'`);
                if (unique && op === 'store') acc[foreignId].push(`'unique:${to.snake(pluralize(entity.tableName))},${foreignId}'`);
                if (unique && op === 'update') acc[foreignId].push(`Rule::unique('${fromTabName}', '${foreignId}')->ignore($${to.camel(entity.name)}->id)`);
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.relationshipType === 'many-to-many' && relation.otherEntityName === entity.name)) // many-to-many Relations [<---]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
                const toInjectedField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
                const fromTabName = pluralize(to.snake(relation.entityName));
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const foreignId = `${toInjectedField}_id`;
                const unique = false;
                const nullable = !relation.inverseRelationshipRequired;
                acc[toInjectedField] = [`'array'`];
                if (nullable) acc[toInjectedField].push(`'sometimes'`);
                if (!nullable) acc[toInjectedField].push(`'required'`);
                if (!nullable) acc[toInjectedField].push(`'min:1'`);
                acc[`${toInjectedField}.*`] = [`'integer'`, `'exists:${fromTabName},id'`];
                return acc;
            }, {}),
        ...relationships
            .filter(relation => (relation.relationshipType === 'many-to-many' && relation.entityName === entity.name)) // many-to-many Relations [--->]
            .reduce((acc, relation) => {
                const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
                const toInjectedField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
                const fromTabName = pluralize(to.snake(relation.entityName));
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const foreignId = `${fromInjectedField}_id`;
                const unique = false;
                const nullable = !relation.relationshipRequired;
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
    constructor(that) {
        this.that = that;
    }

    generateEntityController(entity, relationships, searchEngine) {
        const hasSoftDelete = !!entity.softDelete;
        const withs = getWits(entity, relationships);
        const createRelated = [];
        relationships.forEach(relation => {
            if (!relation.relationshipName && !relation.otherEntityRelationshipName) {
                relation.otherEntityRelationshipName = relation.entityName;
                relation.relationshipName = relation.otherEntityName;
            }
            return relation;
        })

        // many-to-many direct relationships
        relationships.filter(relation => (
            relation.relationshipType === 'many-to-many'
            && relation.entityName === entity.name
            && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            const fromField = to.snake(relation.relationshipName || relation.otherEntityName);
            const toEntity = relation.otherEntityName;
            if (relation.relationshipType === 'many-to-many') {
                createRelated.push(`\n            if(array_key_exists("${fromField}", $validated)) {
                $${to.camel(entity.name)}->${fromField}()->sync($validated['${fromField}']);
            }\n`);
            }
        });

        // many-to-many reverse relationships
        relationships.filter(relation => (
            relation.relationshipType === 'many-to-many'
            && relation.otherEntityName === entity.name
            && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
        )).forEach(relation => {
            const toField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
            const fromEntity = relation.entityName;
            if (relation.relationshipType === 'many-to-many') {
                createRelated.push(`\n            if(array_key_exists("${toField}", $validated)) {
                $${to.camel(entity.name)}->${toField}()->sync($validated['${toField}']);
            }\n`);
            }
        });

        const relatedEntitiesForFilters = relationships.filter(relation =>
            relation.relationshipType === 'one-to-one'
            && relation.otherEntityName === entity.name
        ).map(rel => {
            return {
                name: rel.entityName,
                injectedField: rel.relationshipName || rel.otherEntityName,
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

        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/AuditController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/AuditController.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/EntityController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/${entity.name}Controller.php`),
            {
                className: entity.name,
                entityName: to.camel(entity.name),
                validationsStore: getValidations(entity, relationships, 'store'),
                validationsUpdate: getValidations(entity, relationships, 'update'),
                fileFields: entity.fields.filter(field => field.type === 'Blob' || field.type === 'AnyBlob' || field.type === 'ImageBlob').map(field => to.snake(field.name)),
                imageFields: entity.fields.filter(field => field.type === 'ImageBlob').map(field => to.snake(field.name)),
                booleanFields: entity.fields.filter(field => field.type === 'Boolean').map(field => to.snake(field.name)),
                withs: withs.length ? `[${withs.join(', ')}]` : null,
                createRelated: createRelated.join(''),
                relatedEntitiesForFilters,
                searchEngine,
                to,
                getSolrSuffix,
                toSearchableArray,
                toSearchableArrayTypes,
            });
        if (hasSoftDelete) {
            this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/TrashedEntityController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/Trashed${entity.name}Controller.php`),
                {
                    className: entity.name,
                    entityName: to.camel(entity.name),
                    validationsStore: getValidations(entity, relationships, 'store'),
                    validationsUpdate: getValidations(entity, relationships, 'update'),
                    fileFields: entity.fields.filter(field => field.type === 'Blob' || field.type === 'AnyBlob' || field.type === 'ImageBlob').map(field => to.snake(field.name)),
                    imageFields: entity.fields.filter(field => field.type === 'ImageBlob').map(field => to.snake(field.name)),
                    booleanFields: entity.fields.filter(field => field.type === 'Boolean').map(field => to.snake(field.name)),
                    withs: withs.length ? `[${withs.join(', ')}]` : null,
                    createRelated: createRelated.join(''),
                    relatedEntitiesForFilters,
                    searchEngine,
                    to,
                    getSolrSuffix,
                    toSearchableArray,
                    toSearchableArrayTypes,
                });
        }
        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/FileController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/FileController.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/KeycloakProxyController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/KeycloakProxyController.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/LogController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/LogController.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/ScoutQuerySanitizer.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/ScoutQuerySanitizer.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/SessionAuthController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/SessionAuthController.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("app/Http/Controllers/UserRoleController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/UserRoleController.php`), {});
    }

    generateControllers() {
        const entities = getEntities(this.that);
        const relationships = getEntitiesRelationships(this.that);
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

        for (const entity of [AcRule, ...entities]) {
            this.generateEntityController(entity, relationships, searchEngine);
        }
    }
}