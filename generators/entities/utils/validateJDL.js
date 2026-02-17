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

const _validatFieldName = (fieldName, entity) => {
    if (fieldName === '') {
        throw new Error('ERROR! Your field name cannot be empty');
    }
    if (!/^[a-z][A-Za-z0-9]*$/.test(fieldName)) {
        throw new Error(`ERROR! Your field name must start with a lower case letter and cannot contain special characters: /^[a-z][A-Za-z0-9]*$/`);
    }
    if (fieldName === 'id') {
        throw new Error(`ERROR! Your field cannot be named 'id' as it conflicts with primary key field.`);
    }
    if (hasDuplicates(entity.body.map(field => to.snake(field.name)))) {
        throw new Error(`ERROR! Your field name cannot use an already existing field name: ${findDuplicates(entity.body.map(field => to.snake(field.name))).join(', ')}`);
    }
    if (isReservedWord(to.snake(fieldName))) {
        throw new Error(`ERROR! '${fieldName}' is a reserved word and cannot be used as a field name for entity '${entity.name}'.`);
    }
}

const _validateRelation = (relation, entities) => {
    if (relation.from?.injectedField && !/^[a-z][A-Za-z0-9]*$/.test(relation.from.injectedField)) {
        throw new Error(`ERROR! The injected field '${relation.from.injectedField}' must start with a lower case letter and cannot contain special characters: /^[a-z][A-Za-z0-9]*$/`);
    }
    const fromEntity = entities.find(entity => entity.name === relation.from.name);
    const toEntity = entities.find(entity => entity.name === relation.to.name);
    const relationshipName = relation.from?.injectedField || (relation.cardinality.includes("ToMany") ? pluralize(to.snake(relation.to.name)) : to.snake(relation.to.name));
    const otherEntityRelationshipName = relation.to.injectedField || (relation.cardinality.includes("ManyTo") ? pluralize(to.snake(relation.from.name)) : to.snake(relation.from.name));
    if (!fromEntity) {
        throw new Error(`ERROR! Entity '${relation.from.name}' in the relationship from '${relation.from.name}' to '${relation.to.name}' does not exist.`);
    }
    if (!toEntity) {
        throw new Error(`ERROR! Entity '${relation.to.name}' in the relationship from '${relation.from.name}' to '${relation.to.name}' does not exist.`);
    }
    if (relationshipName === 'id') {
        throw new Error(`ERROR! The injected field in the relationship from '${relation.from.name}' to '${relation.to.name}' cannot be named 'id' as it conflicts with the primary key field.`);
    }
    if (otherEntityRelationshipName === 'id') {
        throw new Error(`ERROR! The injected field in the inverse relationship from '${relation.from.name}' to '${relation.to.name}' cannot be named 'id' as it conflicts with the primary key field.`);
    }
    if (isReservedWord(relationshipName)) {
        throw new Error(`ERROR! The injected field '${relationshipName}' in the relationship from '${relation.from.name}' to '${relation.to.name}' is a reserved word and cannot be used as a field name.`);
    }
    if (isReservedWord(otherEntityRelationshipName)) {
        throw new Error(`ERROR! The injected field '${otherEntityRelationshipName}' in the inverse relationship from '${relation.from.name}' to '${relation.to.name}' is a reserved word and cannot be used as a field name.`);
    }
    fromEntity.body.forEach(field => {
        if (to.snake(field.name) === to.snake(relationshipName)) {
            throw new Error(`ERROR! The injected field '${relationshipName}' in the relationship from '${relation.from.name}' to '${relation.to.name}' conflicts with an existing field in entity '${fromEntity.name}'.`);
        }
    });
    toEntity.body.forEach(field => {
        if (to.snake(field.name) === to.snake(otherEntityRelationshipName)) {
            throw new Error(`ERROR! The injected field '${otherEntityRelationshipName}' in the inverse relationship from '${relation.from.name}' to '${relation.to.name}' conflicts with an existing field in entity '${toEntity.name}'.`);
        }
    });
    if (relation.from.name === relation.to.name && (relation.from.required || relation.to.required)) {
        throw new Error(`ERROR! Required relationships to the same entity are not supported, for relationship from '${relation.from.name}' to '${relation.to.name}'.`)
    }
    if (relation.cardinality === 'OneToOne' && !relation.from.injectedField && !!relation.to.injectedField) {
        throw new Error(`ERROR! In the One-to-One relationship from ${relation.from.name} to ${relation.to.name}, the source entity must possess the destination, or you must invert the direction of the relationship.`);
    }
}

const _validateTableName = (tableName, name) => {
    if (isReservedTableName(tableName)) {
        throw new Error(`ERROR! The table name '${tableName}' for entity '${name}' is a reserved word.`);
    }
    if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
        throw new Error(`ERROR! Table names must start with a lower case letter and can only contain lowercase letters, numbers and underscores: /^[a-z][a-z0-9_]*$/, got '${tableName}' for entity '${name}'`);
    }
}

const _validateTableNames = (entities, otherTableNames) => {
    const tableNames = entities.map(({ name, tableName }) => name === tableName ? to.snake(pluralize(name)) : tableName);
    hasDuplicates(tableNames) && (() => { throw new Error(`ERROR! Duplicate table names are not allowed: ${findDuplicates(tableNames).join(', ')}`); })();
    hasDuplicates([...tableNames, ...otherTableNames]) && (() => { throw new Error(`ERROR! Table names must be unique and cannot conflict with existing tables: ${findDuplicates([...tableNames, ...otherTableNames]).join(', ')}`); })();
    entities.forEach(entity => {
        let { name, tableName } = entity;
        tableName = name === tableName ? to.snake(pluralize(name)) : tableName;
        _validateTableName(tableName, name);
    });
}

const _validateEntityName = (name) => {
    if (isReservedWord(to.snake(name))) {
        throw new Error(`ERROR! '${name}' is a reserved word and cannot be used as an entity name`);
    }
}

const _validateEntitiesName = (entities, otherEntityNames) => {
    const entityNames = entities.map(e => e.name);
    hasDuplicates(entityNames) && (() => { throw new Error(`ERROR! Duplicate entity names are not allowed: ${findDuplicates(entityNames).join(', ')}`); })();
    hasDuplicates([...entityNames, ...otherEntityNames]) && (() => { throw new Error(`ERROR! Entity names must be unique and cannot conflict with existing entities: ${findDuplicates([...entityNames, ...otherEntityNames]).join(', ')}`); })();
    entities.forEach(({ name }) => _validateEntityName(name));
}

export function validateJDL(that, parsedJDL) {
    const { entities, relationships } = parsedJDL;
    // const entityNames = entities.map(e => e.name);
    // const tableNames = entities.map(({ name, tableName }) => name === tableName ? to.snake(pluralize(name)) : tableName);
    // const otherEntityNames = getEntitiesNames(that);
    // const otherTableNames = getEntitiesTableNames(that);
    _validateEntitiesName(entities, getEntitiesNames(that));
    _validateTableNames(entities, getEntitiesTableNames(that));
    // hasDuplicates(entityNames) && (() => { throw new Error(`ERROR! Duplicate entity names are not allowed: ${findDuplicates(entityNames).join(', ')}`); })();
    // hasDuplicates(tableNames) && (() => { throw new Error(`ERROR! Duplicate table names are not allowed: ${findDuplicates(tableNames).join(', ')}`); })();
    // hasDuplicates([...entityNames, ...otherEntityNames]) && (() => { throw new Error(`ERROR! Entity names must be unique and cannot conflict with existing entities: ${findDuplicates([...entityNames, ...otherEntityNames]).join(', ')}`); })();
    // hasDuplicates([...tableNames, ...otherTableNames]) && (() => { throw new Error(`ERROR! Table names must be unique and cannot conflict with existing tables: ${findDuplicates([...tableNames, ...otherTableNames]).join(', ')}`); })();
    entities.forEach(entity => {
        // let { name, tableName } = entity;
        // tableName = name === tableName ? to.snake(pluralize(name)) : tableName;
        // // _validateEntityName(name);
        // _validateTableName(tableName, name);
        entity.body.forEach(({ name }) => _validatFieldName(name, entity));
    });
    relationships.forEach(relation => _validateRelation(relation, entities));
    // throw new Error('Validation passed successfully.');
}