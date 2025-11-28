import to from 'to-case';
import pluralize from 'pluralize';
const tab = (n) => (Array(n)).fill('    ').join('');

export class MigrationsGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = that.fs.readJSON(that.destinationPath('.pninja/Entities.json'));
        this.baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
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
            'LocalTime': 'time',
            'Duration': 'bigInteger',
            'UUID': 'uuid',
            'Blob': 'binary',
            'AnyBlob': 'binary',
            'ImageBlob': 'binary',
            'TextBlob': 'longText',
        };

        const enm = enums.reduce((res, e) => {
            if (e.name === jhipsterType) {
                return e.values.map(v => v.value || v.key)
            }
            return res;
        }, undefined);

        return typeMap[jhipsterType] || enm || 'string';
    }
    convertFields(fields, enums) {
        return fields.reduce((res, field) => {
            const fieldName = to.snake(field.name);
            const fieldType = this.convertFieldType(field.type, enums);
            let fieldTypeParams = '';
            if (fieldType === 'decimal') {
                fieldTypeParams = ', 21, 2';
            } else if (fieldType === 'float') {
                fieldTypeParams = ', 6, 4';
            } else if (fieldType === 'double') {
                fieldTypeParams = ', 15, 8';
            } else if (fieldType === 'timestamp') {
                fieldTypeParams = ', 6';
            }
            if (fieldType !== 'binary') {
                let fieldDefinition = typeof fieldType === 'string' ? `$table->${fieldType}('${fieldName}'${fieldTypeParams})` : `$table->string('${fieldName}', 255)`;
                fieldDefinition += '->nullable()'; // required will be handled by the controller
                if (field.validations.reduce((unique, validation) => unique || validation.key === 'unique', false)) {
                    fieldDefinition += '->unique()';
                }
                res.push(`${fieldDefinition};`);
            } else {
                res.push(`$table->longText('${fieldName}_blob')->nullable();`);
                res.push(`$table->string('${fieldName}_type')->nullable();`);
                res.push(`$table->string('${fieldName}_name')->nullable();`);
            }
            return res;
        }, []);
    }
    createTables() {
        const { enums, entities } = this.parsedJDL;
        const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
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

        entities.forEach(entity => {
            const up = [];
            const down = [];
            const entityTable = pluralize(to.snake(entity.name))
            // OneToOne Relations
            relationships
                .filter(relation => (relation.cardinality === 'OneToOne' && relation.from.name === entity.name))
                .forEach(relation => {
                    const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                    const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                    const fromTabName = pluralize(to.snake(relation.from.name));
                    const toTabName = pluralize(to.snake(relation.to.name));
                    const foreignId = `${fromInjectedField}_id`;
                    const unique = true;
                    const nullable = !relation.from.required;
                    up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
                    down.push(`$table->dropForeign(['${foreignId}']);`);
                });
            // OneToMany Relations
            relationships
                .filter(relation => (relation.cardinality === 'OneToMany' && relation.to.name === entity.name))
                .forEach(relation => {
                    const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                    const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                    const fromTabName = pluralize(to.snake(relation.from.name));
                    const toTabName = pluralize(to.snake(relation.to.name));
                    const foreignId = `${toInjectedField}_id`;
                    const unique = false;
                    const nullable = !relation.from.required;
                    up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${fromTabName}')->nullOnDelete();`);
                    down.push(`$table->dropForeign(['${foreignId}']);`);
                });
            // ManyToOne Relations
            relationships
                .filter(relation => (relation.cardinality === 'ManyToOne' && relation.from.name === entity.name))
                .forEach(relation => {
                    const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                    const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                    const fromTabName = pluralize(to.snake(relation.from.name));
                    const toTabName = pluralize(to.snake(relation.to.name));
                    const foreignId = `${fromInjectedField}_id`;
                    const unique = false;
                    const nullable = !relation.from.required;
                    up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
                    down.push(`$table->dropForeign(['${foreignId}']);`);
                });
            this.that.fs.copyTpl(this.that.templatePath("migration_create_relations.php.ejs"), this.that.destinationPath(`server/database/migrations/${this.baseTimestamp}_002_add_relationships_to_${entityTable}_table.php`),
                {
                    entityTable: entityTable,
                    up: up.join(`\n${tab(3)}`),
                    down: down.join(`\n${tab(3)}`),
                }
            )
        });
    }

    generatePivotMigrations() {
        this.parsedJDL.relationships
            .filter(relationship => relationship.cardinality === 'ManyToMany')
            .map(relation => {
                const fromForeignId = to.snake(relation.from.injectedField || relation.to.name);
                const toForeignId = to.snake(relation.to.injectedField || relation.from.name);
                const fromTabName = pluralize(to.snake(relation.from.name));
                const toTabName = pluralize(to.snake(relation.to.name));
                const pivotName = [to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_');
                const nullable = !relation.from.required;
                return {
                    fromForeignId,
                    toForeignId,
                    fromTabName,
                    toTabName,
                    pivotName,
                    nullable
                }
            }).map(migration => this.that.fs.copyTpl(this.that.templatePath("migration_create_pivot_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${this.baseTimestamp}_003_create_${migration.pivotName}_table.php`),
                {
                    fromForeignId: migration.fromForeignId,
                    toForeignId: migration.toForeignId,
                    fromTabName: migration.fromTabName,
                    toTabName: migration.toTabName,
                    pivotName: migration.pivotName,
                    nullable: migration.nullable
                }
            ));
    }

    generateMigrations() {
        this.createTables();
        this.createRelations();
        this.generatePivotMigrations();
    }
}