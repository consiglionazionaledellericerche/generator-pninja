// import ansiColors from 'ansi-colors';
import to from 'to-case';
import pluralize from 'pluralize';
import ansiColors from 'ansi-colors';
import { parseJDL } from '../../utils/jdlParser.js';

const tab = (n) => (Array(n)).fill('    ').join('');

export function convertFieldType(jhipsterType, enums) {
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
        'byte[]': 'binary',
        'TextBlob': 'text',
        'Blob': 'binary'
    };

    const enm = enums.reduce((res, e) => {
        if (e.name === jhipsterType) {
            return e.values.map(v => v.key)
        }
        return res;
    }, undefined);

    return typeMap[jhipsterType] || enm || 'string';
}

export function convertFields(fields, enums) {
    return fields.map(field => {
        const fieldName = to.snake(field.name);
        const fieldType = convertFieldType(field.type, enums);
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

export function createTables() {
    const { enums, entities } = this.parsedJDL;
    const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_presto_entity';
    for (const entity of entities) {
        const tabName = to.snake(pluralize(entity.tableName));
        const columns = convertFields(entity.body, enums);
        this.fs.copyTpl(this.templatePath("migration_create_table.php.ejs"), this.destinationPath(`server/database/migrations/${baseTimestamp}_001_create_${tabName}_table.php`),
            {
                tabName: tabName,
                columns: columns.join(`\n${tab(3)}`),
            });

    }
}

const createOneToOneRelation = (rel) => {
    const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_presto_entity';
    let fromInjectedField = rel.from.injectedField;
    let toInjectedField = rel.to.injectedField;
    if (fromInjectedField === null && toInjectedField !== null) {
        throw new Error(`ERROR! In the One-to-One relationship from ${rel.from.name} to ${rel.to.name}, the source entity must possess the destination, or you must invert the direction of the relationship.`)
    }
    if (fromInjectedField === null && toInjectedField === null) {
        fromInjectedField = to.snake(rel.to.name);
        toInjectedField = to.snake(rel.from.name);
    }
    fromInjectedField = fromInjectedField || to.snake(rel.to.name);
    const fromTabName = pluralize(to.snake(rel.from.name));
    const toTabName = pluralize(to.snake(rel.to.name));
    const foreignId = `${fromInjectedField}_id`;
    this.fs.copyTpl(this.templatePath("migration_create_relation.php.ejs"), this.destinationPath(`server/database/migrations/${baseTimestamp}_002_add_relationship_${foreignId}_from_${fromTabName}_table.php`),
        {
            fromTabName,
            toTabName,
            foreignId,
            unique: true,
        });
}

export function createRelations() {
    const { entities, relationships } = this.parsedJDL;
    if (!relationships || relationships.length === 0) return;
    for (const relationship of relationships) {
        if (relationship.cardinality === 'OneToOne') {
            createOneToOneRelation(relationship);
        }
    }
}


export function createMigrations(jdlFile) {
    this.parsedJDL = parseJDL(jdlFile);
    createTables();
    createRelations();
}