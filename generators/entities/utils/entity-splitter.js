import to from 'to-case';
import pluralize from "pluralize";
import { isReservedWord, isReservedTableName } from '../../utils/reserved-words.js';

/**
 * Processes JDL entities data to create individual entity configuration objects
 * @returns {Array} Array of entity configuration objects
 * @throws Will throw an error if a reserved word is used as a table name or field name
 * */
export function getEntitiesConfig(entitiesData) {
    return entitiesData.entities.map(entity => {
        const entityConfig = {
            name: entity.name,
            tableName: entity.name === entity.tableName ? to.snake(pluralize(entity.name)) : entity.tableName,
            softDelete: entity.annotations?.some(a => a.optionName === 'softDelete') || false,
            icon: entity.annotations?.find(a => a.optionName === 'icon')?.optionValue || null,
            fields: [],
            relationships: []
        };

        if (isReservedTableName(entityConfig.tableName)) {
            throw new Error(`ERROR! The table name '${entityConfig.tableName}' for entity '${entityConfig.name}' is a reserved word.`);
        }

        // Convert body to fields
        if (entity.body) {
            entityConfig.fields = entity.body.map(field => {
                if (isReservedWord(to.snake(field.name))) {
                    throw new Error(`ERROR! '${field.name}' is a reserved word and cannot be used as a field name for entity '${entityConfig.name}'.`);
                }

                const fieldConfig = {
                    name: field.name,
                    type: field.type,
                    validations: []
                };

                // Convert validations
                if (field.validations && field.validations.length > 0) {
                    fieldConfig.validations = field.validations.map(validation => ({
                        key: validation.key,
                        value: validation.value || ''
                    }));
                }

                return fieldConfig;
            });
        }

        // Find relationships for this entity
        if (entitiesData.relationships) {
            entitiesData.relationships.forEach(rel => {
                if (rel.cardinality === 'OneToOne' && !rel.from.injectedField && !!rel.to.injectedField) {
                    throw new Error(`ERROR! In the One-to-One relship from ${rel.from.name} to ${rel.to.name}, the source entity must possess the destination, or you must invert the direction of the relationship.`);
                }
                // Check if this entity is the 'from' side
                if (rel.from.name === entity.name) {
                    const relationship = {
                        entityName: rel.from.name,
                        owner: (rel.from.injectedField || (!rel.from.injectedField && !rel.to.injectedField)) ? rel.from.name : rel.to.name,
                        relationshipName: rel.from.injectedField || (convertCardinality(rel.cardinality).includes("-to-many") ? pluralize(to.snake(rel.to.name)) : to.snake(rel.to.name)),
                        otherEntityName: rel.to.name,
                        relationshipType: convertCardinality(rel.cardinality),
                        otherEntityField: rel.from.injectedFieldLabel || 'id',
                        relationshipRequired: rel.from.required || false,
                        bidirectional: !!rel.to.injectedField || (!rel.from.injectedField && !rel.to.injectedField)
                    };

                    if (relationship.bidirectional) {
                        relationship.otherEntityRelationshipName = rel.to.injectedField || (convertCardinality(rel.cardinality).includes("many-to-") ? pluralize(to.snake(rel.from.name)) : to.snake(rel.from.name));
                        relationship.inverseEntityField = rel.to.injectedFieldLabel || 'id';
                        relationship.inverseRelationshipRequired = rel.to.required || false;
                    }

                    entityConfig.relationships.push(relationship);
                }
            });
        }

        return entityConfig;
    });

}

/**
 * Processes JDL enums data to create individual enum configuration objects
 * @return {Array} Array of enum configuration objects
 * */

export function getEnumsConfig(entitiesData) {
    return entitiesData.enums ?
        entitiesData.enums.map(enm => {
            const enumConfig = {
                name: enm.name,
                values: enm.values.map(v => ({
                    key: v.key,
                    value: v.value || v.key
                }))
            };

            return enumConfig;
        })
        : [];
}

/**
 * Splits Entities JSON data (from JDL parser) into individual entity files
 * @param {Object} fs - Yeoman file system instance
 * @param {Function} destinationPath - Function to resolve destination paths
 * @returns {Array} Array of created entity file paths
 */

export function splitEntitiesFile(entitiesData, fs, destinationPath) {
    const createdFiles = [];

    // Process each entity
    entitiesData.entities.forEach(entity => {
        const entityConfig = {
            name: entity.name,
            tableName: entity.name === entity.tableName ? to.snake(pluralize(entity.name)) : entity.tableName,
            softDelete: entity.annotations?.some(a => a.optionName === 'softDelete') || false,
            icon: entity.annotations?.find(a => a.optionName === 'icon')?.optionValue || null,
            fields: [],
            relationships: []
        };

        // Convert body to fields
        if (entity.body) {
            entityConfig.fields = entity.body.map(field => {
                const fieldConfig = {
                    name: field.name,
                    type: field.type,
                    validations: []
                };

                // Convert validations
                if (field.validations && field.validations.length > 0) {
                    fieldConfig.validations = field.validations.map(validation => ({
                        key: validation.key,
                        value: validation.value || ''
                    }));
                }

                return fieldConfig;
            });
        }

        // Find relationships for this entity
        if (entitiesData.relationships) {
            entitiesData.relationships.forEach(rel => {
                // Check if this entity is the 'from' side
                if (rel.from.name === entity.name) {
                    const relationship = {
                        entityName: rel.from.name,
                        owner: (rel.from.injectedField || (!rel.from.injectedField && !rel.to.injectedField)) ? rel.from.name : rel.to.name,
                        relationshipName: rel.from.injectedField || (convertCardinality(rel.cardinality).includes("-to-many") ? pluralize(to.snake(rel.to.name)) : to.snake(rel.to.name)),
                        otherEntityName: rel.to.name,
                        relationshipType: convertCardinality(rel.cardinality),
                        otherEntityField: rel.from.injectedFieldLabel || 'id',
                        relationshipRequired: rel.from.required || false,
                        bidirectional: !!rel.to.injectedField || (!rel.from.injectedField && !rel.to.injectedField)
                    };

                    if (relationship.bidirectional) {
                        relationship.otherEntityRelationshipName = rel.to.injectedField || (convertCardinality(rel.cardinality).includes("many-to-") ? pluralize(to.snake(rel.from.name)) : to.snake(rel.from.name));
                        relationship.inverseEntityField = rel.to.injectedFieldLabel || 'id';
                        relationship.inverseRelationshipRequired = rel.to.required || false;
                    }

                    entityConfig.relationships.push(relationship);
                }
            });
        }

        // Save individual entity file
        const entityFilePath = destinationPath(`.pninja/${entity.name}.json`);
        fs.writeJSON(entityFilePath, entityConfig, null, 2);
        createdFiles.push(entityFilePath);
    });

    // Process enums
    if (entitiesData.enums) {
        entitiesData.enums.forEach(enm => {
            const enumConfig = {
                name: enm.name,
                values: enm.values.map(v => ({
                    key: v.key,
                    value: v.value || v.key
                }))
            };

            const enumFilePath = destinationPath(`.pninja/${enm.name}.enum.json`);
            fs.writeJSON(enumFilePath, enumConfig, null, 2);
            createdFiles.push(enumFilePath);
        });
    }

    return createdFiles;
}

/**
 * Converts JDL cardinality format to relationship type
 * @param {string} cardinality - Cardinality from JDL (e.g., 'ManyToOne')
 * @param {boolean} isFromSide - Whether this is the 'from' side of the relationship
 * @returns {string} Relationship type (e.g., 'many-to-one')
 */
function convertCardinality(cardinality) {
    const cardinalityMap = {
        'ManyToOne': 'many-to-one',
        'OneToMany': 'one-to-many',
        'ManyToMany': 'many-to-many',
        'OneToOne': 'one-to-one'
    };

    return cardinalityMap[cardinality] || cardinality.toLowerCase();
}