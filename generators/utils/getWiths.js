import to from 'to-case';

export function getWits(entity, relationships) {
    const withs = [];

    // one-to-many/many-to-many direct relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-many' || relation.relationshipType === 'many-to-many')
        && relation.owner === entity.name
    )).forEach(relation => {
        const fromField = to.snake(relation.relationshipName || relation.otherEntityName);
        withs.push(`'${fromField}'`);
    });

    // one-to-many/many-to-many reverse relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-many' || relation.relationshipType === 'many-to-many')
        && relation.owner === relation.otherEntityName
    )).forEach(relation => {
        const toField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
        withs.push(`'${toField}'`);
    });

    // one-to-one/many-to-one direct relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one')
        && relation.entityName === entity.name
        && relation.owner === entity.name
    )).forEach(relation => {
        console.log('processing direct one-to-one/many-to-one direct relationship');
        console.log('entity', entity.name);
        console.log('relation', relation);
        const fromField = relation.relationshipName;
        withs.push(`'${fromField}'`);
    });

    // one-to-one/many-to-one inverse relationships
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one')
        && relation.otherEntityName === entity.name
        && relation.bidirectional
    )).forEach(relation => {
        console.log('processing reverse one-to-one/many-to-one inverse relationship');
        console.log('entity', entity.name);
        console.log('relation', relation);
        const toField = relation.otherEntityRelationshipName;
        withs.push(`'${toField}'`);
    });

    return withs;
}