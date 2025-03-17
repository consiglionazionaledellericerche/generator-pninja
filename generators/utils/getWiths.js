import to from 'to-case';

export function getWits(entity, relationships) {
    const withs = [];
    relationships.forEach(relation => {
        if (!relation.from.injectedField && !relation.to.injectedField) {
            relation.to.injectedField = relation.from.name;
            relation.from.injectedField = relation.to.name;
        }
        return relation;
    })

    // OneToMany/ManyToMany direct relationships
    relationships.filter(relation => (
        (relation.cardinality === 'OneToMany' || relation.cardinality === 'ManyToMany') && relation.from.name === entity.name
        && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    )).forEach(relation => {
        const fromField = to.snake(relation.from.injectedField || relation.to.name);
        withs.push(`'${fromField}'`);
    });

    // OneToMany/ManyToMany reverse relationships
    relationships.filter(relation => (
        (relation.cardinality === 'OneToMany' || relation.cardinality === 'ManyToMany') && relation.to.name === entity.name
        && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    )).forEach(relation => {
        const toField = to.snake(relation.to.injectedField || relation.from.name);
        withs.push(`'${toField}'`);
    });

    // OneToMany/ManyToOne direct relationships
    relationships.filter(relation => (
        (relation.cardinality === 'OneToOne' || relation.cardinality === 'ManyToOne') && relation.from.name === entity.name
        && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    )).forEach(relation => {
        const fromField = to.snake(relation.from.injectedField || relation.to.name);
        withs.push(`'${fromField}'`);
    });

    // ManyToOne reverse relationships
    relationships.filter(relation => (
        (relation.cardinality === 'OneToOne' || relation.cardinality === 'ManyToOne') && relation.to.name === entity.name
        && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
    )).forEach(relation => {
        const toField = to.snake(relation.to.injectedField || relation.from.name);
        withs.push(`'${toField}'`);
    });

    return withs;
}
