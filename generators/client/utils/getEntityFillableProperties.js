import to from 'to-case';

export function getEntityFillableProperties(entity, relationships) {
    const fillable = entity.fields.map(prop => `${to.snake(prop.name)}`);
    relationships.filter(relation => (
        (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'one-to-many')
        && relation.otherEntityName === entity.name
    )).forEach(relation => {
        fillable.push(`${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id`);
    });
    relationships.filter(relation => (
        relation.relationshipType === 'many-to-one' && relation.entityName === entity.name
    )).forEach(relation => {
        fillable.push(`${to.snake(relation.relationshipName || relation.otherEntityName)}_id`);
    });
    return fillable;
}