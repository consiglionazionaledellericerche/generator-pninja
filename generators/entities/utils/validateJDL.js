import to from 'to-case';
import pluralize from "pluralize";
import { isReservedWord, isReservedTableName } from '../../utils/reserved-words.js';
import { getEntitiesNames, getEntitiesTableNames } from '../../utils/entities-utils.js';

const hasDuplicates = (arr) => new Set(arr).size !== arr.length;

function findDuplicates(arr) {
    const seen = new Set();
    const duplicates = new Set();

    for (const item of arr) {
        if (seen.has(item)) {
            duplicates.add(item);
        } else {
            seen.add(item);
        }
    }

    return [...duplicates];
}

export function validatFieldName(fieldName, entity) {
    if (fieldName === '') {
        return 'Your field name cannot be empty';
    }
    if (!/^[a-z][A-Za-z0-9]*$/.test(fieldName)) {
        return `Your field name must start with a lower case letter and cannot contain special characters: /^[a-z][A-Za-z0-9]*$/`;
    }

    const snakeCaseName = to.snake(fieldName);

    // Check against reserved field 'id' and existing fields
    if (fieldName === 'id') {
        return `Your field name cannot use an already existing field name: id`;
    }

    if (hasDuplicates(entity.body.map(field => to.snake(field.name)))) {
        return `Your field name cannot use an already existing field name: ${findDuplicates(entity.body.map(field => to.snake(field.name))).join(', ')}`;
    }

    // Check against current entity's relationships
    // TODO

    // Check against inverse relationships from other entities
    // TODO

    // Check against database/framework reserved words
    if (isReservedWord(snakeCaseName)) {
        return `'${fieldName}' is a reserved word and cannot be used as a field name`;
    }
    return true;
}

export function validateJDL(that, parsedJDL) {
    const { entities, relationships } = parsedJDL;
    const entityNames = entities.map(e => e.name);
    const tableNames = entities.map(({ name, tableName }) => name === tableName ? to.snake(pluralize(name)) : tableName);
    const otherEntityNames = getEntitiesNames(that);
    const otherTableNames = getEntitiesTableNames(that);
    hasDuplicates(entityNames) && (() => { throw new Error(`Duplicate entity names are not allowed: ${findDuplicates(entityNames).join(', ')}`); })();
    hasDuplicates(tableNames) && (() => { throw new Error(`Duplicate table names are not allowed: ${findDuplicates(tableNames).join(', ')}`); })();
    hasDuplicates([...entityNames, ...otherEntityNames]) && (() => { throw new Error(`Entity names must be unique and cannot conflict with existing entities: ${findDuplicates([...entityNames, ...otherEntityNames]).join(', ')}`); })();
    hasDuplicates([...tableNames, ...otherTableNames]) && (() => { throw new Error(`Table names must be unique and cannot conflict with existing tables: ${findDuplicates([...tableNames, ...otherTableNames]).join(', ')}`); })();
    entities.forEach(entity => {
        let { name, tableName } = entity;
        tableName = name === tableName ? to.snake(pluralize(name)) : tableName;
        if (isReservedWord(to.snake(name))) {
            throw new Error(`'${name}' is a reserved word and cannot be used as an entity name`);
        }
        if (isReservedTableName(tableName)) {
            throw new Error(`'${tableName}' is a reserved word and cannot be used as a table name`);
        }
        if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
            throw new Error(`Table names must start with a lower case letter and can only contain lowercase letters, numbers and underscores: /^[a-z][a-z0-9_]*$/, got '${tableName}' for entity '${name}'`);
        }
        entity.body.forEach(field => {
            const { name } = field;
            if (validatFieldName(name, entity) !== true) {
                throw new Error(validatFieldName(name, entity));
            }
        });
    });
    relationships.forEach(relation => {
        if (relation.from.name === relation.to.name && (relation.from.required || relation.to.required)) {
            throw new Error(`${colors.redBright('ERROR!')} Required relationships to the same entity are not supported, for relationship from and to '${relation.from.name}'.`)
        }
    });
}