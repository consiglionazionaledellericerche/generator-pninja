import to from 'to-case';

export function getWits(entity, relationships) {
    const withs = [];
    relationships.forEach(relation => {
        if (!relation.relationshipName && !relation.otherEntityRelationshipName) {
            relation.otherEntityRelationshipName = relation.entityName;
            relation.relationshipName = relation.otherEntityName;
        }
        return relation;
    })

    // one-to-many/many-to-many direct relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-many' || relation.relationshipType === 'many-to-many')
        && relation.entityName === entity.name
        && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    )).forEach(relation => {
        const fromField = to.snake(relation.relationshipName || relation.otherEntityName);
        withs.push(`'${fromField}'`);
    });

    // one-to-many/many-to-many reverse relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-many' || relation.relationshipType === 'many-to-many')
        && relation.otherEntityName === entity.name
        && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    )).forEach(relation => {
        const toField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
        withs.push(`'${toField}'`);
    });

    // one-to-many/many-to-one direct relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one')
        && relation.entityName === entity.name
        && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    )).forEach(relation => {
        const fromField = to.snake(relation.relationshipName || relation.otherEntityName);
        withs.push(`'${fromField}'`);
    });

    // many-to-one reverse relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one')
        && relation.otherEntityName === entity.name
        && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    )).forEach(relation => {
        const toField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
        withs.push(`'${toField}'`);
    });

    return withs;
}