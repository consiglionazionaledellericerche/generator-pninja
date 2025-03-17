import to from 'to-case';

export function getModelForeignIds(entity, relationships) {
    const foreignIds = [];

    relationships
        .filter(relation => (relation.cardinality === 'OneToMany' && relation.to.name === entity.name))
        .forEach(relation => {
            const injectedField = to.snake(relation.to.injectedField || relation.from.name);
            const foreignId = `${injectedField}_id`;
            const nullable = !relation.from.required;
            const related = relation.from.name;
            const labelField = relation.to.injectedFieldLabel;
            const cardinality = relation.cardinality;
            foreignIds.push({ foreignId, injectedField, labelField, nullable, related, cardinality })
        });

    relationships
        .filter(relation =>
            (relation.cardinality === 'OneToOne' || relation.cardinality === 'ManyToOne') && relation.from.name === entity.name
        )
        .forEach(relation => {
            const injectedField = to.snake(relation.from.injectedField || relation.to.name);
            const foreignId = `${injectedField}_id`;
            const nullable = !relation.from.required;
            const related = relation.to.name;
            const labelField = relation.from.injectedFieldLabel;
            const cardinality = relation.cardinality;
            foreignIds.push({ foreignId, injectedField, labelField, nullable, related, cardinality })
        });

    return foreignIds;
}