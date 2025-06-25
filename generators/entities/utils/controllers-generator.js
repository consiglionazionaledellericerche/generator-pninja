import to from 'to-case';
import { parseJDL } from '../../utils/jdlParser.js';
import { getWits } from '../../utils/getWiths.js';
import jsonColorz from 'json-colorz';

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
                    fileFields: entity.body.filter(c => c.type === 'Blob' || c.type === 'ImageBlob').map(c => to.snake(c.name)),
                    withs: withs.length ? `[${withs.join(', ')}]` : null,
                    createRelated: createRelated.join(''),
                    relatedEntitiesForFilters,
                    to,
                });
        }
    }
}