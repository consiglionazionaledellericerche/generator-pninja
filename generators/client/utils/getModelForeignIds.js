import to from 'to-case';

export function getModelForeignIds(entity, relationships) {
    const foreignIds = [];

    relationships
        .filter(relation => (relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name))
        .forEach(relation => {
            const relationshipName = to.snake(relation.otherEntityRelationshipName || relation.entityName);
            const foreignId = `${relationshipName}_id`;
            const nullable = !relation.inverseRelationshipRequired;
            const related = relation.entityName;
            const labelField = relation.inverseEntityField;
            const relationshipType = relation.relationshipType;
            foreignIds.push({ foreignId, relationshipName, labelField, nullable, related, relationshipType })
        });

    relationships
        .filter(relation =>
            (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one') && relation.entityName === entity.name
        )
        .forEach(relation => {
            const relationshipName = to.snake(relation.relationshipName || relation.otherEntityName);
            const foreignId = `${relationshipName}_id`;
            const nullable = !relation.relationshipRequired;
            const related = relation.otherEntityName;
            const labelField = relation.otherEntityField;
            const relationshipType = relation.relationshipType;
            foreignIds.push({ foreignId, relationshipName, labelField, nullable, related, relationshipType })
        });

    return foreignIds;
}