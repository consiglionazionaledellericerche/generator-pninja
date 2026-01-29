import to from 'to-case';
import pluralize from "pluralize";

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
            tableName: entity.tableName,
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
                        relationshipName: rel.from.injectedField || convertCardinality(rel.cardinality, true).includes("-to-many") ? pluralize(to.snake(rel.to.name)) : to.snake(rel.to.name),
                        otherEntityName: rel.to.name,
                        relationshipType: convertCardinality(rel.cardinality, true),
                        otherEntityField: rel.from.injectedFieldLabel || 'id',
                        relationshipRequired: rel.from.required || false,
                        bidirectional: !!rel.to.injectedField
                    };

                    // if (relationship.bidirectional) {
                    relationship.otherEntityRelationshipName = rel.to.injectedField || convertCardinality(rel.cardinality, true).includes("many-to-") ? pluralize(to.snake(rel.from.name)) : to.snake(rel.from.name);
                    relationship.inverseEntityField = rel.to.injectedFieldLabel || 'id';
                    relationship.inverseRelationshipRequired = rel.to.required || false;
                    // }

                    entityConfig.relationships.push(relationship);
                }
            });
        }

        // Save individual entity file
        const entityFilePath = destinationPath(`.pninja/${entity.name}.json`);
        console.log(`=====================${"=".repeat(entity.name.length + 2)}===========================`);
        console.log(`===================== ${entity.name} ===========================`);
        console.log(`=====================${"=".repeat(entity.name.length + 2)}===========================`);
        console.log(JSON.stringify(entityConfig, null, 2));
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
function convertCardinality(cardinality, isFromSide) {
    const cardinalityMap = {
        'ManyToOne': 'many-to-one',
        'OneToMany': isFromSide ? 'one-to-many' : 'many-to-one',
        'ManyToMany': 'many-to-many',
        'OneToOne': 'one-to-one'
    };

    return cardinalityMap[cardinality] || cardinality.toLowerCase();
}