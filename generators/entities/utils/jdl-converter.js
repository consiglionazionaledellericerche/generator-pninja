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

        const relationsFilter = (rel) => {
            if (rel.cardinality === 'ManyToOne') {
                return rel.from.name === entityName
                    || (rel.to.name === entityName && rel.to.injectedField)
                    || (rel.to.name === entityName && !rel.to.injectedField && !rel.from.injectedField);
            }
            return rel.from.name === entityName || rel.to.name === entityName;
        }

        const relevantRelationships = relationships
            .filter(relationsFilter)
            .map(rel => {
                const isSource = rel.from.name === entityName;
                const otherSide = isSource ? rel.to : rel.from;

                let relationType = undefined;
                if (rel.cardinality === 'OneToMany') {
                    relationType = isSource ? 'one-to-many' : 'many-to-one';
                } else if (rel.cardinality === 'ManyToOne') {
                    relationType = isSource ? 'many-to-one' : 'one-to-many';
                } else {
                    relationType = this._convertRelationshipType(rel.cardinality);
                }

                const rx = /^(.*)\(([^)]*)\)$/;

                const relationshipName = isSource ?
                    (rel.from.injectedField || to.camel(otherSide.name)) :
                    (rel.to.injectedField || to.camel(otherSide.name));
                const otherEntityRelationshipName = isSource ?
                    (otherSide.injectedField || to.camel(entityName)) :
                    (rel.from.injectedField || to.camel(entityName));

                const relationship = {
                    otherEntityField: rx.test(relationshipName) ? relationshipName.replace(rx, "$2") : 'id',
                    otherEntityName: to.camel(otherSide.name),
                    otherEntityRelationshipName: otherEntityRelationshipName?.replace(rx, "$1"),
                    relationshipName: relationshipName.replace(rx, "$1"),
                    relationshipSide: isSource ? "left" : "right",
                    relationshipType: relationType
                };

                if (relationship.otherEntityField === 'id') {
                    delete relationship.otherEntityField;
                }
                if (relationship.otherEntityRelationshipName === relationship.otherEntityName) {
                    delete relationship.otherEntityRelationshipName;
                }
                // if (!relationship.otherEntityRelationshipName) {
                //     delete relationship.otherEntityRelationshipName;
                // }
                // if (relationType === 'many-to-one' && !otherSide.injectedField) {
                //     delete relationship.otherEntityRelationshipName;
                // }

                // console.log(`\n\n\nentityName: ${entityName}`)
                // console.log(`rel: ${JSON.stringify(rel, null, 2)}`)
                // console.log(`isSource: ${isSource}`)
                // console.log(`rel.from.injectedField: ${rel.from.injectedField}`)
                // console.log(`rel.to.injectedField: ${rel.to.injectedField}`)
                // console.log(`otherSide.injectedField: ${otherSide.injectedField}`)
                // console.log(`entityName: ${entityName}`)
                // console.log(`otherSide.name: ${otherSide.name}`)
                // console.log(`relationship: ${JSON.stringify(relationship, null, 2)}`)

                return relationship;
            });
        // .reduce((rels, rel) => {
        //     // Escludo le relazioni right/one-to-one come fa jhipster
        //     if (!(rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right')) rels.push(rel);
        //     return rels;
        // }, []);

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