import to from 'to-case';
import pluralize from 'pluralize';
import jhipsterCore from 'jhipster-core';
// import jclrz from 'json-colorz';
const { parseFromFiles } = jhipsterCore;
const tab = (n) => (Array(n)).fill('    ').join('');

export class MigrationsGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseFromFiles([this.entitiesFilePath]);
        this.baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_presto_entity';
    }
    convertFieldType(jhipsterType, enums) {
        const typeMap = {
            'String': 'string',
            'Integer': 'integer',
            'Long': 'bigInteger',
            'BigDecimal': 'decimal',
            'Float': 'float',
            'Double': 'double',
            'Boolean': 'boolean',
            'LocalDate': 'date',
            'ZonedDateTime': 'timestamp',
            'Instant': 'timestamp',
            // 'Duration': TODO,
            // 'UUID': TODO,
            'Blob': 'binary',
            // 'AnyBlob': 'binary', TODO
            // 'ImageBlob': 'binary', TODO
            // 'byte[]': 'binary',
            'TextBlob': 'text',
        };

        const enm = enums.reduce((res, e) => {
            if (e.name === jhipsterType) {
                return e.values.map(v => v.key)
            }
            return res;
        }, undefined);

        return typeMap[jhipsterType] || enm || 'string';
    }
    convertFields(fields, enums) {
        return fields.map(field => {
            const fieldName = to.snake(field.name);
            const fieldType = this.convertFieldType(field.type, enums);
            let fieldDefinition = typeof fieldType === 'string' ? `$table->${fieldType}('${fieldName}')` : `$table->enum('${fieldName}', ${JSON.stringify(fieldType)})`;
            if (field.validations.length === 0) {
                fieldDefinition += '->nullable()';
            } else if (!field.validations.reduce((required, validation) => required || validation.key === 'required', false)) {
                fieldDefinition += '->nullable()';
            }
            if (field.validations.reduce((unique, validation) => unique || validation.key === 'unique', false)) {
                fieldDefinition += '->unique()';
            }
            // for (const validation of field.validations) {
            //     if (validation.key === 'unique') fieldDefinition += '->unique()';
            //     if (validation.key === 'min') fieldDefinition += `->min(${validation.value})`;
            //     if (validation.key === 'max') fieldDefinition += `->max(${validation.value})`;
            //     if (validation.key === 'minlength') fieldDefinition += `->minlength(${validation.value})`;
            //     if (validation.key === 'maxlength') fieldDefinition += `->maxlength(${validation.value})`;
            // }
            return `${fieldDefinition};`;
        });
    }
    createTables() {
        const { enums, entities } = this.parsedJDL;
        const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_presto_entity';
        for (const entity of entities) {
            const tabName = to.snake(pluralize(entity.tableName));
            const columns = this.convertFields(entity.body, enums);
            this.that.fs.copyTpl(this.that.templatePath("migration_create_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${baseTimestamp}_001_create_${tabName}_table.php`),
                {
                    tabName: tabName,
                    columns: columns.join(`\n${tab(3)}`),
                });
        }
    }
    createRelations() {
        const { entities, relationships } = this.parsedJDL;
        if (!relationships || relationships.length === 0) return;
        relationships.forEach(relation => {
            if (relation.cardinality === 'OneToOne' && !relation.from.injectedField && !!relation.to.injectedField) {
                throw new Error(`ERROR! In the One-to-One relationship from ${relation.from.name} to ${relation.to.name}, the source entity must possess the destination, or you must invert the direction of the relationship.`)
            }
        })

        // OneToOne/OneToMany Relations
        entities.forEach(entity => {
            const up = [];
            const down = [];
            const entityTable = pluralize(to.snake(entity.name))
            relationships
                .filter(relation =>
                    (relation.cardinality === 'OneToOne' && relation.to.name === entity.name)
                    || (relation.cardinality === 'OneToMany' && relation.to.name === entity.name)
                )
                .forEach(relation => {
                    const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                    const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                    const fromTabName = pluralize(to.snake(relation.from.name));
                    const toTabName = pluralize(to.snake(relation.to.name));
                    const foreignId = `${toInjectedField}_id`;
                    const unique = relation.cardinality === 'OneToOne';
                    const nullable = !relation.from.required;
                    up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}${nullable ? '->nullable()' : ''}->constrained('${fromTabName}');`);
                    down.push(`$table->dropForeign(['${foreignId}']);`);
                });
            this.that.fs.copyTpl(this.that.templatePath("migration_create_relations.php.ejs"), this.that.destinationPath(`server/database/migrations/${this.baseTimestamp}_002_add_relationships_to_${entityTable}_table.php`),
                {
                    entityTable: entityTable,
                    up: up.join(`\n${tab(3)}`),
                    down: down.join(`\n${tab(3)}`),
                }
            )
        })


        return;
        entities.map(entity => {
            return {
                table: to.snake(pluralize(entity.tableName)),
                relationships: relationships.filter(relation => (
                    relation.cardinality === 'OneToOne' && relation.from.name === entity.name
                    || relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
                    || relation.cardinality === 'OneToMany' && relation.to.name === entity.name
                )).map(relation => {
                    let fromInjectedField = to.snake(relation.from.injectedField || '');
                    let toInjectedField = to.snake(relation.to.injectedField || '');
                    let fromTabName = undefined;
                    let toTabName = undefined;
                    let foreignId = undefined;
                    let unique = undefined;
                    let nullable = undefined;
                    if (relation.cardinality === 'OneToOne' && fromInjectedField === '' && toInjectedField !== '') {
                        throw new Error(`ERROR! In the One-to-One relationship from ${relation.from.name} to ${relation.to.name}, the source entity must possess the destination, or you must invert the direction of the relationship.`)
                    }
                    if (fromInjectedField === '' && toInjectedField === '') {
                        toInjectedField = to.snake(relation.from.name);
                    }
                    if (relation.cardinality === 'OneToOne' || relation.cardinality === 'ManyToOne') {
                        fromInjectedField = fromInjectedField || to.snake(relation.to.name);
                        fromTabName = pluralize(to.snake(relation.from.name));
                        toTabName = pluralize(to.snake(relation.to.name));
                        foreignId = `${fromInjectedField}_id`;
                        unique = relation.cardinality === 'OneToOne';
                        nullable = !relation.from.required;
                        return {
                            up: `$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}${nullable ? '->nullable()' : ''}->constrained('${toTabName}');`,
                            down: `$table->dropForeign(['${foreignId}']);\n${tab(3)}$table->dropColumn('${foreignId}');`,
                        }
                    }
                    if (relation.cardinality === 'OneToMany') {
                        toInjectedField = toInjectedField || to.snake(relation.from.name);
                        fromTabName = pluralize(to.snake(relation.from.name));
                        toTabName = pluralize(to.snake(relation.to.name));
                        foreignId = `${toInjectedField}_id`;
                        unique = false;
                        nullable = !relation.to.required;
                        return {
                            up: `$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}${nullable ? '->nullable()' : ''}->constrained('${fromTabName}');`,
                            down: `$table->dropForeign(['${foreignId}']);\n${tab(3)}$table->dropColumn('${foreignId}');`,
                        }
                    }
                }),
            }
        }).map(migration => migration.relationships.length && this.that.fs.copyTpl(this.that.templatePath("migration_create_relations.php.ejs"), this.that.destinationPath(`server/database/migrations/${this.baseTimestamp}_002_add_relationships_to_${migration.table}_table.php`),
            {
                fromTabName: migration.table,
                up: migration.relationships.map(r => r.up).join(`\n${tab(3)}`),
                down: migration.relationships.map(r => r.down).join(`\n${tab(3)}`),
            }
        ));
    }

    generatePivotMigrations() {
        this.parsedJDL.relationships
            .filter(relationship => relationship.cardinality === 'ManyToMany')
            .map(relation => {
                const fromForeignId = to.snake(relation.from.injectedField || relation.to.name);
                const toForeignId = to.snake(relation.to.injectedField || relation.from.name);
                const fromTabName = pluralize(to.snake(relation.from.name));
                const toTabName = pluralize(to.snake(relation.to.name));
                const pivotName = [fromTabName, toTabName].sort().join('_');
                return {
                    fromForeignId,
                    toForeignId,
                    fromTabName,
                    toTabName,
                    pivotName,
                }
            }).map(migration => this.that.fs.copyTpl(this.that.templatePath("migration_create_pivot_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${this.baseTimestamp}_003_create_${migration.pivotName}_table.php`),
                {
                    fromForeignId: migration.fromForeignId,
                    toForeignId: migration.toForeignId,
                    fromTabName: migration.fromTabName,
                    toTabName: migration.toTabName,
                    pivotName: migration.pivotName,
                }
            ));
    }

    generateMigrations() {
        this.createTables();
        this.createRelations();
        this.generatePivotMigrations();
    }
}