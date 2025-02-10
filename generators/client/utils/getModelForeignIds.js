import to from 'to-case';

export function getModelForeignIds(entity, relationships) {
    const foreignIds = [];

    relationships
        .filter(relation =>
            (relation.cardinality === 'OneToOne' && relation.to.name === entity.name)
            || (relation.cardinality === 'OneToMany' && relation.to.name === entity.name)
        )
        .forEach(relation => {
            const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
            const foreignId = `${toInjectedField}_id`;
            const nullable = !relation.from.required;
            foreignIds.push({ foreignId, nullable })
        });

    relationships
        .filter(relation =>
            relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
        )
        .forEach(relation => {
            const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
            const foreignId = `${fromInjectedField}_id`;
            const nullable = !relation.from.required;
            foreignIds.push({ foreignId, nullable })
        });

    return foreignIds;
}