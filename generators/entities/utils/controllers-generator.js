import to from 'to-case';
import pluralize from 'pluralize';
import { parseJDL } from '../../utils/jdlParser.js';
import { getWits } from '../../utils/getWiths.js';

export class ControllersGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseJDL(this.entitiesFilePath);
    }
    generateControllers() {
        const { enums, entities, relationships } = this.parsedJDL;

        this.that.fs.copyTpl(this.that.templatePath("ApiErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/ApiErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("NotFoundErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/NotFoundErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("DatabaseErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/DatabaseErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("ValidationErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/ValidationErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("HandlesApiErrors.php.ejs"), this.that.destinationPath(`server/app/Traits/HandlesApiErrors.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("HandlesUserRoles.php.ejs"), this.that.destinationPath(`server/app/Traits/HandlesUserRoles.php`), {});

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
                    createRelated.push(`
            if(array_key_exists("${fromField}", $request->all())) {
                $ids = array_map(function($o) {
                    if(is_numeric($o)) return $o;
                    if(array_key_exists("id", $o)) return (\\App\\Models\\${toEntity}::findOrFail($o["id"]))->id;
                    return (\\App\\Models\\${toEntity}::create($o))->id;
                }, $request->all()["${fromField}"]);
                $${to.camel(entity.name)}->${fromField}()->sync($ids ?? []);
            };`);
                }
            });

            // OneToOne/OneToMany/ManyToMany reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany'
                && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                const toField = to.snake(relation.to.injectedField || relation.from.name);
                const fromEntity = relation.from.name;
                if (relation.cardinality === 'ManyToMany') {
                    createRelated.push(`
            if(array_key_exists("${toField}", $request->all())) {
                $related = array_map(function($o) {
                    if(is_numeric($o)) return \\App\\Models\\${fromEntity}::findOrFail($o);
                    if(array_key_exists("id", $o)) return \\App\\Models\\${fromEntity}::findOrFail($o["id"]);
                    return new \\App\\Models\\${fromEntity}($o);
                }, $request->all()["${toField}"]);
                $${to.camel(entity.name)}->${toField}()->sync($related ?? []);
            };`);
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

            this.that.fs.copyTpl(this.that.templatePath("KeycloakProxyController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/KeycloakProxyController.php`), {});
            this.that.fs.copyTpl(this.that.templatePath("FileController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/FileController.php`), {});
            this.that.fs.copyTpl(this.that.templatePath("SessionAuthController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/SessionAuthController.php`), {});
            this.that.fs.copyTpl(this.that.templatePath("EntityController.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/${entity.name}Controller.php`),
                {
                    className: entity.name,
                    entityName: to.camel(entity.name),
                    validationsStore: entity.body
                        .filter(field => !(['ImageBlob', 'Blob', 'TextBlob', 'AnyBlob', 'byte[]'].includes(field.type)))
                        .map(field => {
                            const { validations } = field;
                            if (!validations.reduce((itsRequired, validation) => { return itsRequired || validation.key === 'required' }, false)) {
                                field.validations.unshift({ key: 'nullable', value: '' });
                            }
                            if (['String', 'UUID'].includes(field.type)) field.validations.unshift({ key: 'fieldType', value: 'string' });
                            if (['BigDecimal', 'Double', 'Float', 'Integer', 'Long'].includes(field.type)) field.validations.unshift({ key: 'fieldType', value: 'numeric' });
                            if (field.type === 'Boolean') field.validations.unshift({ key: 'fieldType', value: 'boolean' });
                            if (field.type === 'UUID') field.validations.push({ key: 'pattern', value: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' });
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
                                if (key === 'unique') {
                                    return `'unique:${to.snake(pluralize(entity.tableName))},${to.snake(name)}'`;
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
                                if (key === 'pattern') {
                                    return `'regex:\/${value}\/'`;
                                }
                            });
                            return acc;
                        }, {}),
                    validationsUpdate: entity.body
                        .filter(field => !(['ImageBlob', 'Blob', 'TextBlob', 'AnyBlob', 'byte[]'].includes(field.type)))
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
                                if (key === 'unique') {
                                    return `Rule::unique('${to.snake(pluralize(entity.tableName))}', '${to.snake(name)}')->ignore($exampleEntity->id)`;
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
                                if (key === 'pattern') {
                                    return `'regex:\/${value}\/'`;
                                }
                            });
                            return acc;
                        }, {}),
                    fileFields: entity.body.filter(field => field.type === 'Blob' || field.type === 'ImageBlob').map(field => to.snake(field.name)),
                    withs: withs.length ? `[${withs.join(', ')}]` : null,
                    createRelated: createRelated.join(''),
                    relatedEntitiesForFilters,
                    to,
                });
        }
    }
}