import to from 'to-case';

export function getEntityFillableProperties(entity, relationships) {
    const fillable = entity.body.map(prop => `${to.snake(prop.name)}`);
    relationships.filter(relation => (
        (relation.cardinality === 'OneToOne' || relation.cardinality === 'OneToMany')
        && relation.to.name === entity.name
    )).forEach(relation => {
        fillable.push(`${to.snake(relation.to.injectedField || relation.from.name)}_id`);
    });
    relationships.filter(relation => (
        relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
    )).forEach(relation => {
        fillable.push(`${to.snake(relation.from.injectedField || relation.to.name)}_id`);
    });
    return fillable;
}