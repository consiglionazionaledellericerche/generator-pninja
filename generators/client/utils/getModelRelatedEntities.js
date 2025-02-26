import to from 'to-case';

export function getModelRelatedEntities(entity, relationships) {
  const relatedEntities = [];

  // OneToOne/OneToMany/ManyToMany direct relationships
  relationships
    .filter(
      (relation) =>
        (relation.cardinality === 'OneToOne' || relation.cardinality === 'OneToMany' || relation.cardinality === 'ManyToMany') &&
        relation.from.name === entity.name &&
        (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    )
    .forEach((relation) => {
      relatedEntities.push({
        field: to.snake(relation.from.injectedField || relation.to.name),
        labelField: relation.from.injectedFieldLabel,
        related: relation.to.name,
        isArray: relation.cardinality !== 'OneToOne',
      });
    });

  // OneToOne/OneToMany/ManyToMany reverse relationships
  relationships
    .filter(
      (relation) =>
        (relation.cardinality === 'OneToOne' || relation.cardinality === 'OneToMany' || relation.cardinality === 'ManyToMany') &&
        relation.to.name === entity.name &&
        (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    )
    .forEach((relation) => {
      relatedEntities.push({
        field: to.snake(relation.to.injectedField || relation.from.name),
        labelField: relation.to.injectedFieldLabel,
        related: relation.from.name,
        isArray: relation.cardinality === 'ManyToMany',
      });
    });

  // ManyToOne direct relationships
  relationships
    .filter(relation => (
      relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
      && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    ))
    .forEach(relation => {
      relatedEntities.push({
        field: to.snake(relation.from.injectedField || relation.to.name),
        labelField: relation.from.injectedFieldLabel,
        related: relation.to.name,
        isArray: false,
      });
    });

  // ManyToOne reverse relationships
  relationships
    .filter(relation => (
      relation.cardinality === 'ManyToOne' && relation.to.name === entity.name
      && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    ))
    .forEach(relation => {
      relatedEntities.push({
        field: to.snake(relation.to.injectedField || relation.from.name),
        labelField: relation.to.injectedFieldLabel,
        related: relation.from.name,
        isArray: true,
      });
    });

  return relatedEntities;
}
