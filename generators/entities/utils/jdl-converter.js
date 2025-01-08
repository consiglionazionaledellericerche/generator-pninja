import jhipsterCore from 'jhipster-core';
import fs from 'fs/promises';
import path from 'path';
import to from 'to-case';

const { parseFromFiles } = jhipsterCore;

export class JDLConverter {
    constructor(outputDir = '.presto') {
        this.outputDir = outputDir;
    }

    async convertToJSON(jdlFilePath) {
        try {
            const parsedJDL = parseFromFiles([jdlFilePath]);
            await fs.mkdir(this.outputDir, { recursive: true });
            const generatedFiles = [];

            for (const entity of parsedJDL.entities) {
                const entityName = entity.name;
                const fields = this._convertFields(entity.body);
                const relationships = this._convertRelationships(entityName, parsedJDL.relationships);
                const options = this._getEntityOptions(entityName, parsedJDL.options);

                const jsonContent = {
                    fields,
                    name: entityName,
                    pagination: options.pagination || 'no',
                    searchEngine: options.searchEngine || 'no',
                    relationships
                };

                const filePath = path.join(this.outputDir, `${entityName}.json`);
                await fs.writeFile(
                    filePath,
                    JSON.stringify(jsonContent, null, 2),
                    'utf8'
                );

                generatedFiles.push(filePath);
            }

            return {
                entities: parsedJDL.entities,
                generatedFiles
            };
        } catch (error) {
            throw error;
        }
    }

    _convertFields(fields) {
        if (!Array.isArray(fields)) return [];

        return fields.map(field => {
            const fieldData = {
                fieldName: field.name,
                fieldType: field.type
            };

            if (field.validations && field.validations.length > 0) {
                fieldData.fieldValidateRules = field.validations.map(v => v.key);

                field.validations.forEach(validation => {
                    if (validation.value) {
                        switch (validation.key) {
                            case 'min':
                                fieldData.fieldValidateRulesMin = parseInt(validation.value);
                                break;
                            case 'max':
                                fieldData.fieldValidateRulesMax = parseInt(validation.value);
                                break;
                            case 'minlength':
                                fieldData.fieldValidateRulesMinlength = parseInt(validation.value);
                                break;
                            case 'maxlength':
                                fieldData.fieldValidateRulesMaxlength = parseInt(validation.value);
                                break;
                            case 'pattern':
                                fieldData.fieldValidateRulesPattern = validation.value;
                                break;
                        }
                    }
                });
            }

            return fieldData;
        });
    }

    _convertRelationships(entityName, relationships) {
        if (!Array.isArray(relationships)) return [];

        const relevantRelationships = relationships
            .filter(rel => {
                if (rel.cardinality === 'ManyToOne') {
                    return rel.from.name === entityName;
                }
                return rel.from.name === entityName || rel.to.name === entityName;
            })
            .map(rel => {
                const isSource = rel.from.name === entityName;
                const otherSide = isSource ? rel.to : rel.from;

                let relationType;
                if (rel.cardinality === 'OneToMany') {
                    relationType = isSource ? 'one-to-many' : 'many-to-one';
                } else {
                    relationType = this._convertRelationshipType(rel.cardinality);
                }

                const rx = /^(.*)\(([^)]*)\)$/;

                const relationshipName = isSource ?
                    (rel.from.injectedField || to.camel(otherSide.name)) :
                    (rel.to.injectedField || to.camel(entityName));
                const otherEntityRelationshipName = isSource ?
                    (otherSide.injectedField || to.camel(entityName)) :
                    (rel.from.injectedField || to.camel(otherSide.name));

                const relationship = {
                    otherEntityField: rx.test(relationshipName) ? relationshipName.replace(rx, "$2") : 'id',
                    otherEntityName: to.camel(otherSide.name),
                    otherEntityRelationshipName: otherEntityRelationshipName.replace(rx, "$1"),
                    relationshipName: relationshipName.replace(rx, "$1"),
                    relationshipSide: isSource ? "left" : "right",
                    relationshipType: relationType
                };

                if (relationship.otherEntityField === 'id') {
                    delete relationship.otherEntityField;
                }
                if (relationType === 'many-to-one' && !otherSide.injectedField) {
                    delete relationship.otherEntityRelationshipName;
                }

                return relationship;
            })
            .reduce((rels, rel) => {
                // Escludo le relazioni right/one-to-one come fa jhipster
                if (!(rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right')) rels.push(rel);
                return rels;
            }, []);

        return relevantRelationships.sort((a, b) => {
            const typeOrder = {
                'one-to-many': 1,
                'many-to-many': 2
            };
            return (typeOrder[a.relationshipType] || 0) - (typeOrder[b.relationshipType] || 0);
        });
    }

    _convertRelationshipType(cardinality) {
        const types = {
            'OneToOne': 'one-to-one',
            'OneToMany': 'one-to-many',
            'ManyToOne': 'many-to-one',
            'ManyToMany': 'many-to-many'
        };
        return types[cardinality] || cardinality.toLowerCase();
    }

    _getEntityOptions(entityName, options) {
        const entityOptions = {};

        if (!options) return entityOptions;

        if (options.pagination) {
            if (options.pagination['infinite-scroll'].list.includes(entityName)) {
                entityOptions.pagination = 'infinite-scroll';
            } else if (options.pagination.pagination.list.includes(entityName)) {
                entityOptions.pagination = 'pagination';
            }
        }

        if (options.search?.elasticsearch?.list.includes(entityName)) {
            entityOptions.searchEngine = 'elasticsearch';
        }

        return entityOptions;
    }
}