import to from 'to-case';
import pluralize from 'pluralize';

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

export function createTable({ entity, enums, that }) {
    const tabName = to.snake(pluralize(entity.tableName));
    const columns = convertFields(entity.body, enums);
    const hasSoftDelete = entity.annotations?.some(
        ann => ann.optionName === 'softDelete' && ann.type === 'UNARY'
    );
    that.fs.copyTpl(that.templatePath("migration_create_table.php.ejs"), that.destinationPath(`server/database/migrations/${baseTimestamp}_001_create_${tabName}_table.php`),
        {
            tabName: tabName,
            columns: columns.join(`\n${tab(3)}`),
            hasSoftDelete,
        });
}