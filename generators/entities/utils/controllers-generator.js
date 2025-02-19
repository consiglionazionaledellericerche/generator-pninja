import to from 'to-case';
import pluralize from 'pluralize';
import jhipsterCore from 'jhipster-core';
import jclrz from 'json-colorz';
const { parseFromFiles } = jhipsterCore;
import _ from 'lodash';

export class ControllersGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseFromFiles([this.entitiesFilePath]);
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateControllers() {
        const { enums, entities, relationships } = this.parsedJDL;

        this.that.fs.copyTpl(this.that.templatePath("DatabaseErrorHandler.php.ejs"), this.that.destinationPath(`server/app/Exceptions/DatabaseErrorHandler.php`), {});
        this.that.fs.copyTpl(this.that.templatePath("HandlesDatabaseErrors.php.ejs"), this.that.destinationPath(`server/app/Traits/HandlesDatabaseErrors.php`), {});

        for (const entity of entities) {
            const withs = [];
            const createRelated = [];
            relationships.forEach(relation => {
                if (!relation.from.injectedField && !relation.to.injectedField) {
                    relation.to.injectedField = relation.from.name;
                    relation.from.injectedField = relation.to.name;
                }
                return relation;
            })

            // OneToOne/OneToMany/ManyToMany direct relationships
            relationships.filter(relation => (
                (relation.cardinality === 'OneToOne' || relation.cardinality === 'OneToMany' || relation.cardinality === 'ManyToMany') && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                const fromField = to.snake(relation.from.injectedField || relation.to.name);
                const toEntity = relation.to.name;
                withs.push(`'${fromField}'`);
                if (relation.cardinality === 'OneToOne') {
                    createRelated.push(`
        if(array_key_exists("${fromField}", $request->all()) && $request->all()["${fromField}"]) {
            $request_${fromField} = $request->all()["${fromField}"];
            if (is_numeric($request_${fromField})) {
                $${fromField} = \\App\\Models\\${toEntity}::findOrFail($request_${fromField});
            } elseif (array_key_exists("id", $request_${fromField})) {
                $${fromField} = \\App\\Models\\${toEntity}::findOrFail($request_${fromField}["id"]);
                $${fromField}->update($request_${fromField});
            } else {
                $${fromField} = new \\App\\Models\\${toEntity}($request_${fromField});
            }
            $${to.camel(entity.name)}->${fromField}()->save($${fromField});
        };`);
                }
                if (relation.cardinality === 'OneToMany') {
                    createRelated.push(`
        if(array_key_exists("${fromField}", $request->all()) && $request->all()["${fromField}"]) {
            $related = array_map(function($o) {
                if(is_numeric($o)) return \\App\\Models\\${toEntity}::findOrFail($o);
                if(array_key_exists("id", $o)) return \\App\\Models\\${toEntity}::findOrFail($o["id"]);
                return new \\App\\Models\\${toEntity}($o);
            }, $request->all()["${fromField}"]);
            $${to.camel(entity.name)}->${fromField}()->saveMany($related);
        };`);
                }
                if (relation.cardinality === 'ManyToMany') {
                    createRelated.push(`
        if(array_key_exists("${fromField}", $request->all()) && $request->all()["${fromField}"]) {
            $ids = array_map(function($o) {
                if(is_numeric($o)) return $o;
                if(array_key_exists("id", $o)) return (\\App\\Models\\${toEntity}::findOrFail($o["id"]))->id;
                return (\\App\\Models\\${toEntity}::create($o))->id;
            }, $request->all()["${fromField}"]);
            $${to.camel(entity.name)}->${fromField}()->sync($ids);
        };`);
                }
            });

            // OneToOne/OneToMany/ManyToMany reverse relationships
            relationships.filter(relation => (
                (relation.cardinality === 'OneToOne' || relation.cardinality === 'OneToMany' || relation.cardinality === 'ManyToMany') && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                const toField = to.snake(relation.to.injectedField || relation.from.name);
                const fromEntity = relation.from.name;
                withs.push(`'${toField}'`);
                if (relation.cardinality === 'OneToOne') {
                    createRelated.push(`
        if(array_key_exists("${toField}", $request->all()) && $request->all()["${toField}"]) {
            $request_${toField} = $request->all()["${toField}"];
            if (is_numeric($request_${toField})) {
                $${toField} = \\App\\Models\\${fromEntity}::findOrFail($request_${toField});
            } elseif (array_key_exists("id", $request_${toField})) {
                $${toField} = \\App\\Models\\${fromEntity}::findOrFail($request_${toField}["id"]);
            } else {
                $${toField} = \\App\\Models\\${fromEntity}::create($request_${toField});
            }
            $${to.camel(entity.name)}->${toField}()->associate($${toField});
            $${to.camel(entity.name)}->save();
        };`);
                }
                if (relation.cardinality === 'OneToMany') {
                    createRelated.push(`
        if(array_key_exists("${toField}", $request->all()) && $request->all()["${toField}"]) {
            $request_${toField} = $request->all()["${toField}"];
            if (is_numeric($request_${toField})) {
                $${toField} = \\App\\Models\\${fromEntity}::findOrFail($request_${toField});
            } elseif (array_key_exists("id", $request_${toField})) {
                $${toField} = \\App\\Models\\${fromEntity}::findOrFail($request_${toField}["id"]);
            } else {
                $${toField} = \\App\\Models\\${fromEntity}::create($request_${toField});
            }
            $${to.camel(entity.name)}->${toField}()->associate($${toField});
            $${to.camel(entity.name)}->save();
        }`);
                }
                if (relation.cardinality === 'ManyToMany') {
                    createRelated.push(`
        if(array_key_exists("${toField}", $request->all()) && $request->all()["${toField}"]) {
            $related = array_map(function($o) {
                if(is_numeric($o)) return \\App\\Models\\${fromEntity}::findOrFail($o);
                if(array_key_exists("id", $o)) return \\App\\Models\\${fromEntity}::findOrFail($o["id"]);
                return new \\App\\Models\\${fromEntity}($o);
            }, $request->all()["${toField}"]);
            $${to.camel(entity.name)}->${toField}()->saveMany($related);
        };`);
                }
            });

            // ManyToOne direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                const fromField = to.snake(relation.from.injectedField || relation.to.name);
                const toEntity = relation.to.name;
                withs.push(`'${fromField}'`);
                createRelated.push(`
		if(array_key_exists("${fromField}", $request->all()) && $request->all()["${fromField}"]) {
            $request_${fromField} = $request->all()["${fromField}"];
            if (is_numeric($request_${fromField})) {
                $${fromField} = \\App\\Models\\${toEntity}::findOrFail($request_${fromField});
            } elseif (array_key_exists("id", $request_${fromField})) {
                $${fromField} = \\App\\Models\\${toEntity}::findOrFail($request_${fromField}["id"]);
            } else {
                $${fromField} = \\App\\Models\\${toEntity}::create($request_${fromField});
            }
            $${to.camel(entity.name)}->${fromField}()->associate($${fromField});
            $${to.camel(entity.name)}->save();
        };`);
            });

            // ManyToOne reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                const toField = to.snake(relation.to.injectedField || relation.from.name);
                const fromEntity = relation.from.name;
                withs.push(`'${toField}'`);
                createRelated.push(`
        if(array_key_exists("${toField}", $request->all()) && $request->all()["${toField}"]) {
            $related = array_map(function($o) {
                if(is_numeric($o)) return \\App\\Models\\${fromEntity}::findOrFail($o);
                if(array_key_exists("id", $o)) return \\App\\Models\\${fromEntity}::findOrFail($o["id"]);
                return new \\App\\Models\\${fromEntity}($o);
            }, $request->all()["${toField}"]);
            $${to.camel(entity.name)}->${toField}()->saveMany($related);
        };`);
            });

            this.that.fs.copyTpl(this.that.templatePath("entity_controller.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/${entity.name}Controller.php`),
                {
                    className: entity.name,
                    entityName: to.camel(entity.name),
                    withs: withs.length ? `[${withs.join(', ')}]` : null, // (_.compact([...withs, ...inverseWiths]).length) ? `['${_.compact([...withs, ...inverseWiths]).join(`','`)}']` : null,
                    createRelated: createRelated.join("\n\n\t\t")
                    // createRelated: [], //_.compact([...createRelated, ...createInverseRelated]).join("\n\n\t\t")
                });
        }
    }
}