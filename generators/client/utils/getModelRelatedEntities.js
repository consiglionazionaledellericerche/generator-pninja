import to from 'to-case';

export function getModelRelatedEntities(entity, relationships) {
  const relatedEntities = [];

  // one-to-many/many-to-many direct relationships
  relationships
    .filter(
      (relation) =>
        (relation.relationshipType === 'one-to-many' || relation.relationshipType === 'many-to-many') &&
        relation.entityName === entity.name &&
        (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    )
    .forEach((relation) => {
      relatedEntities.push({
        field: to.snake(relation.relationshipName || relation.otherEntityName),
        labelField: relation.otherEntityField,
        related: relation.otherEntityName,
        relatedField: to.snake(relation.otherEntityRelationshipName || relation.entityName),
        nullable: !relation.relationshipRequired,
        isArray: relation.relationshipType !== 'one-to-one',
        relationshipType: relation.relationshipType,
        reverse: false,
      });
    });

  // one-to-many/many-to-many reverse relationships
  relationships
    .filter(
      (relation) =>
        (relation.relationshipType === 'one-to-many' || relation.relationshipType === 'many-to-many') &&
        relation.otherEntityName === entity.name &&
        (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    )
    .forEach((relation) => {
      relatedEntities.push({
        field: to.snake(relation.otherEntityRelationshipName || relation.entityName),
        labelField: relation.inverseEntityField,
        related: relation.entityName,
        nullable: !relation.inverseRelationshipRequired,
        isArray: relation.relationshipType === 'many-to-many',
        relationshipType: relation.relationshipType,
        reverse: true,
      });
    });

  // one-to-one/many-to-one direct relationships
  relationships
    .filter(relation => (
      (relation.relationshipType === 'one-to-one' || relation.relationshipType === 'many-to-one')
      && relation.entityName === entity.name
      && (!!relation.relationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    ))
    .forEach(relation => {
      relatedEntities.push({
        field: to.snake(relation.relationshipName || relation.otherEntityName),
        labelField: relation.otherEntityField,
        related: relation.otherEntityName,
        nullable: !relation.relationshipRequired,
        isArray: false,
        relationshipType: relation.relationshipType,
        reverse: false,
      });
    });

  // one-to-one reverse relationships
  relationships
    .filter(relation => (
      relation.relationshipType === 'one-to-one' && relation.otherEntityName === entity.name && !!relation.otherEntityRelationshipName
    ))
    .forEach(relation => {
      relatedEntities.push({
        field: to.snake(relation.otherEntityRelationshipName || relation.entityName),
        labelField: relation.inverseEntityField,
        related: relation.entityName,
        isArray: false,
        relationshipType: relation.relationshipType,
        reverse: true,
      });
    });

  // many-to-one reverse relationships
  relationships
    .filter(relation => (
      relation.relationshipType === 'many-to-one' && relation.otherEntityName === entity.name
      && (!!relation.otherEntityRelationshipName || (!relation.relationshipName && !relation.otherEntityRelationshipName))
    ))
    .forEach(relation => {
      relatedEntities.push({
        field: to.snake(relation.otherEntityRelationshipName || relation.entityName),
        labelField: relation.inverseEntityField,
        related: relation.entityName,
        isArray: true,
        relationshipType: relation.relationshipType,
        reverse: true,
      });
    });
  return relatedEntities;
}
