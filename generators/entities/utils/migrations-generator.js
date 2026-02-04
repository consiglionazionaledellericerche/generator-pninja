import to from 'to-case';
import pluralize from 'pluralize';
import { AcRule } from '../../utils/AcRule.js';
import { getEntities, getEntitiesRelationships, getEnums } from '../../utils/entities-utils.js';

const tab = (n) => (Array(n)).fill('    ').join('');
const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';

function convertFieldType(jhipsterType, enums) {
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

function convertFields(fields, enums) {
    return fields.reduce((res, field) => {
        const fieldName = to.snake(field.name);
        const fieldType = convertFieldType(field.type, enums);
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

function getFieldsNames(fields, enums) {
    return fields.reduce((res, field) => {
        const fieldName = to.snake(field.name);
        const fieldType = convertFieldType(field.type, enums);
        if (fieldType !== 'binary') {
            res.push(fieldName);
        } else {
            res.push(`${fieldName}_blob`);
            res.push(`${fieldName}_type`);
            res.push(`${fieldName}_name`);
        }
        return res;
    }, []);
}

export class MigrationsGenerator {
    constructor(that) {
        this.that = that;
        this.baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
    }

    removeColumns({ entity, enums }) {
        console.log(`Generating migration to remove columns from ${entity.name} entity...`);
        console.log(JSON.stringify(entity, null, 2));
        const tabName = entity.tableName;
        const downColumns = convertFields(entity.fields, enums).join(`\n${tab(3)}`);
        const columnsNames = getFieldsNames(entity.fields, enums);
        this.that.fs.copyTpl(this.that.templatePath("migration_remove_columns_from_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${baseTimestamp}_004_remove_columns_from_${tabName}_table.php`),
            {
                tabName,
                columnsNames,
                downColumns,
            });
    }

    createTable({ entity, enums }) {
        const tabName = entity.tableName;
        const columns = convertFields(entity.fields, enums).join(`\n${tab(3)}`);
        const softDelete = !!entity?.softDelete;
        this.that.fs.copyTpl(this.that.templatePath("migration_create_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${baseTimestamp}_001_create_${tabName}_table.php`),
            {
                tabName,
                columns,
                softDelete,
            });
    }

    createTables() {
        const entities = getEntities(this.that);
        const enums = getEnums(this.that);
        for (const entity of [AcRule, ...entities]) {
            this.createTable({ entity, enums });
        }
        this.that.fs.copyTpl(this.that.templatePath("database/migrations/create_audits_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${this.baseTimestamp}_001_create_audits_table.php`), {
            authentication: this.that.config.get('authentication'),
        });
    }

    createRelation({ entity, relationships }) {
        const up = [];
        const down = [];
        const entityTable = pluralize(to.snake(entity.name))
        // OneToOne Relations
        relationships
            .filter(relation => (relation.relationshipType === 'one-to-one' && relation.entityName === entity.name))
            .forEach(relation => {
                const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const foreignId = `${fromInjectedField}_id`;
                const unique = true;
                up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
                down.push(`$table->dropForeign(['${foreignId}']);`);
            });
        // OneToMany Relations
        relationships
            .filter(relation => (relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name))
            .forEach(relation => {
                const toInjectedField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
                const fromTabName = pluralize(to.snake(relation.entityName));
                const foreignId = `${toInjectedField}_id`;
                const unique = false;
                up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${fromTabName}')->nullOnDelete();`);
                down.push(`$table->dropForeign(['${foreignId}']);`);
            });
        // ManyToOne Relations
        relationships
            .filter(relation => (relation.relationshipType === 'many-to-one' && relation.entityName === entity.name))
            .forEach(relation => {
                const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const foreignId = `${fromInjectedField}_id`;
                const unique = false;
                up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
                down.push(`$table->dropForeign(['${foreignId}']);`);
            });
        this.that.fs.copyTpl(this.that.templatePath("migration_create_relations.php.ejs"), this.that.destinationPath(`server/database/migrations/${baseTimestamp}_002_add_relationships_to_${entityTable}_table.php`),
            {
                entityTable: entityTable,
                up: up.join(`\n${tab(3)}`),
                down: down.join(`\n${tab(3)}`),
            }
        )
    }

    createRelations() {
        const entities = getEntities(this.that);
        const relationships = getEntitiesRelationships(this.that);
        if (!relationships || relationships.length === 0) return;

        entities.forEach(entity => {
            this.createRelation({ entity, relationships });
        });
    }

    generatePivotMigrations(relationships) {
        relationships
            .filter(relationship => relationship.relationshipType === 'many-to-many')
            .map(relation => {
                const fromForeignId = to.snake(relation.relationshipName || relation.otherEntityName);
                const toForeignId = to.snake(relation.otherEntityRelationshipName || relation.entityName);
                const fromTabName = pluralize(to.snake(relation.entityName));
                const toTabName = pluralize(to.snake(relation.otherEntityName));
                const pivotName = [to.snake(relation.entityName), to.snake(relation.otherEntityName)].sort().join('_');
                return {
                    fromForeignId,
                    toForeignId,
                    fromTabName,
                    toTabName,
                    pivotName
                }
            }).map(migration => this.that.fs.copyTpl(this.that.templatePath("migration_create_pivot_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${baseTimestamp}_003_create_${migration.pivotName}_table.php`),
                {
                    fromForeignId: migration.fromForeignId,
                    toForeignId: migration.toForeignId,
                    fromTabName: migration.fromTabName,
                    toTabName: migration.toTabName,
                    pivotName: migration.pivotName
                }
            ));
    }

    createPivotMigrations() {
        const relationships = getEntitiesRelationships(this.that);
        this.generatePivotMigrations(relationships);
    }

    generateMigrations() {
        this.createTables();
        this.createRelations();
        this.createPivotMigrations();
    }
}