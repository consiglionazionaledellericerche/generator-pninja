import to from 'to-case';
import pluralize from 'pluralize';
import jhipsterCore from 'jhipster-core';
// import jclrz from 'json-colorz';
const { parseFromFiles } = jhipsterCore;

export class ModelsGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseFromFiles([this.entitiesFilePath]);
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateModels() {
        const { enums, entities, relationships } = this.parsedJDL;
        for (const entity of entities) {
            const className = entity.name;
            const tableName = to.snake(pluralize(entity.tableName));
            const fillable = entity.body.map(prop => `'${prop.name}'`);
            const relations = relationships.filter(relation => (
                relation.cardinality === 'OneToOne' && relation.from.name === entity.name
                || relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
                // || relation.cardinality === 'OneToMany' && relation.to.name === entity.name
            )).map(relation => {
                let fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
                let toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
                switch (relation.cardinality) {
                    case 'OneToOne':
                        return `public function ${fromInjectedField}(): HasOne { return $this->hasOne(${relation.to.name}::class); }`;
                    case 'ManyToOne':
                        return `public function ${fromInjectedField}(): BelongsTo { return $this->belongsTo(${relation.to.name}::class, '${getVariableNameFromEntityName(relation.to)}_id'); }`;
                    // case 'OneToMany':
                    //     return `public function ${fromInjectedField}(): HasMany { return $this->hasMany(${getClassNameFromEntityName(relation.to)}::class); }`;
                    // case 'ManyToMany':
                    //     return `public function ${fromInjectedField}(): BelongsToMany { return $this->belongsToMany(${getClassNameFromEntityName(relation.to)}::class); }`;
                }

            })
            this.that.fs.copyTpl(this.that.templatePath("entity_model.php.ejs"), this.that.destinationPath(`server/app/Models/${className}.php`),
                {
                    className,
                    tableName,
                    fillable,
                    relations: [...relations].join(`\n${this.tab()}`),
                });
        }
    }
}



export const createEntityModels = async (that) => {
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
        .columns(["name", "class", "table", "variable", "path"])
        .rows();
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];
        const props = await withCSV(that.destinationPath(`.presto-properties.csv`))
            .columns(["entity", "column", "type"])
            .filter(row => row.entity === entity.name)
            .rows();
        const relations = await withCSV(that.destinationPath(`.presto-relations.csv`))
            .columns(["type", "from", "to", "fromProp", "toProp", "fromLabel", "toLabel"])
            .filter(row => row.from === entity.name)
            .rows();
        const inverseRelations = await withCSV(that.destinationPath(`.presto-relations.csv`))
            .columns(["type", "from", "to", "fromProp", "toProp", "fromLabel", "toLabel"])
            .filter(row => row.to === entity.name)
            .rows();
        that.fs.copyTpl(that.templatePath("entity_model.php.ejs"), that.destinationPath(`server/app/Models/${entity.class}.php`),
            {
                className: entity.class,
                fillable: props.map(p => `'${p.column}'`).join(', '),
                relations: [...relations.map(r => getRelationForModel(r)), ...inverseRelations.map(r => getInverseRelationForModel(r))].join("\n\n\t")
            });
    }
}


const getRelationForModel = (relation) => {
    if (!relation.fromProp) return;
    switch (relation.type) {
        case 'many-to-one':
            return `public function ${toCase.snake(relation.fromProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.to)}::class, '${getVariableNameFromEntityName(relation.to)}_id'); }`;
        case 'one-to-many':
            return `public function ${toCase.snake(relation.fromProp)}(): HasMany { return $this->hasMany(${getClassNameFromEntityName(relation.to)}::class); }`;
        case 'one-to-one':
            return `public function ${toCase.snake(relation.fromProp)}(): HasOne { return $this->hasOne(${getClassNameFromEntityName(relation.to)}::class); }`;
        case 'many-to-many':
            return `public function ${toCase.snake(relation.fromProp)}(): BelongsToMany { return $this->belongsToMany(${getClassNameFromEntityName(relation.to)}::class); }`;
    }
}

const getInverseRelationForModel = (relation) => {
    if (!relation.toProp) return null;
    switch (relation.type) {
        case 'many-to-one':
            return `public function ${toCase.snake(relation.toProp)}(): HasMany { return $this->hasMany(${getClassNameFromEntityName(relation.from)}::class); }`;
        case 'one-to-many':
            return `public function ${toCase.snake(relation.toProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.from)}::class, '${getVariableNameFromEntityName(relation.from)}_id'); }`;
        case 'one-to-one':
            return `public function ${toCase.snake(relation.toProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.from)}::class, '${getVariableNameFromEntityName(relation.from)}_id'); }`;
        case 'many-to-many':
            return `public function ${toCase.snake(relation.toProp)}(): BelongsToMany { return $this->belongsToMany(${getClassNameFromEntityName(relation.from)}::class); }`;
    }
}