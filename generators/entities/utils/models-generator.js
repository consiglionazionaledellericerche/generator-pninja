import to from 'to-case';
import pluralize from 'pluralize';
import jhipsterCore from 'jhipster-core';
import jclrz from 'json-colorz';
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
            // fillable from entity property
            const fillable = entity.body.map(prop => `'${to.snake(prop.name)}'`);
            const relations = [];
            // fillable from entity OneToOne relations
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne'
                && relation.to.name === entity.name
            )).forEach(relation => {
                fillable.push(`'${to.snake(relation.to.injectedField || relation.from.name)}_id'`);
            });

            // OneToOne direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): HasOne { return $this->hasOne(${relation.to.name}::class, '${to.snake(relation.to.injectedField || relation.from.name)}_id'); }`);
            });

            // OneToOne reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): BelongsTo { return $this->belongsTo(${relation.from.name}::class, '${to.snake(relation.to.injectedField || relation.from.name)}_id'); }`);
            });

            // OneToMany direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToMany' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): HasMany { return $this->hasMany(${relation.to.name}::class, '${to.snake(relation.to.injectedField || relation.from.name)}_id'); }`);
            });

            // OneToMany reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToMany' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): BelongsTo { return $this->belongsTo(${relation.from.name}::class, '${to.snake(relation.to.injectedField || relation.from.name)}_id'); }`);
            });

            // ManyToOne direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): BelongsTo { return $this->belongsTo(${relation.to.name}::class, '${to.snake(relation.from.injectedField || relation.to.name)}_id'); }`);
            });

            // ManyToOne reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): HasMany { return $this->hasMany(${relation.from.name}::class, '${to.snake(relation.from.injectedField || relation.to.name)}_id'); }`);
            });

            // ManyToMany direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany' && relation.from.name === entity.name
                && (!!relation.from.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): BelongsToMany { return $this->belongsToMany(${relation.to.name}::class, '${[to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_')}'); }`);
            });

            // ManyToMany reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): BelongsToMany { return $this->belongsToMany(${relation.from.name}::class, '${[to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_')}'); }`);
            });

            this.that.fs.copyTpl(this.that.templatePath("entity_model.php.ejs"), this.that.destinationPath(`server/app/Models/${className}.php`),
                {
                    className,
                    tableName,
                    fillable: fillable.join(', '),
                    relations: relations.join(`\n${this.tab(1)}`), //[...relations, ...reverseRelations].join(`\n${this.tab(1)}`),
                });
        }
    }
}



// export const createEntityModels = async (that) => {
//     const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
//         .columns(["name", "class", "table", "variable", "path"])
//         .rows();
//     for (let index = 0; index < entities.length; index++) {
//         const entity = entities[index];
//         const props = await withCSV(that.destinationPath(`.presto-properties.csv`))
//             .columns(["entity", "column", "type"])
//             .filter(row => row.entity === entity.name)
//             .rows();
//         const relations = await withCSV(that.destinationPath(`.presto-relations.csv`))
//             .columns(["type", "from", "to", "fromProp", "toProp", "fromLabel", "toLabel"])
//             .filter(row => row.from === entity.name)
//             .rows();
//         const inverseRelations = await withCSV(that.destinationPath(`.presto-relations.csv`))
//             .columns(["type", "from", "to", "fromProp", "toProp", "fromLabel", "toLabel"])
//             .filter(row => row.to === entity.name)
//             .rows();
//         that.fs.copyTpl(that.templatePath("entity_model.php.ejs"), that.destinationPath(`server/app/Models/${entity.class}.php`),
//             {
//                 className: entity.class,
//                 fillable: props.map(p => `'${p.column}'`).join(',                    '),
//                 relations: [...relations.map(r => getRelationForModel(r)), ...inverseRelations.map(r => getInverseRelationForModel(r))].join("\n\n\t")
//             });
//     }
// }


// const getRelationForModel = (relation) => {
//     if (!relation.fromProp) return;
//     switch (relation.type) {
//         case 'many-to-one':
//             return `public function ${toCase.snake(relation.fromProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.to)}::class, '${getVariableNameFromEntityName(relation.to)}_id'); }`;
//         case 'one-to-many':
//             return `public function ${toCase.snake(relation.fromProp)}(): HasMany { return $this->hasMany(${getClassNameFromEntityName(relation.to)}::class); }`;
//         case 'one-to-one':
//             return `public function ${toCase.snake(relation.fromProp)}(): HasOne { return $this->hasOne(${getClassNameFromEntityName(relation.to)}::class); }`;
//         case 'many-to-many':
//             return `public function ${toCase.snake(relation.fromProp)}(): BelongsToMany { return $this->belongsToMany(${getClassNameFromEntityName(relation.to)}::class); }`;
//     }
// }

// const getInverseRelationForModel = (relation) => {
//     if (!relation.toProp) return null;
//     switch (relation.type) {
//         case 'many-to-one':
//             return `public function ${toCase.snake(relation.toProp)}(): HasMany { return $this->hasMany(${getClassNameFromEntityName(relation.from)}::class); }`;
//         case 'one-to-many':
//             return `public function ${toCase.snake(relation.toProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.from)}::class, '${getVariableNameFromEntityName(relation.from)}_id'); }`;
//         case 'one-to-one':
//             return `public function ${toCase.snake(relation.toProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.from)}::class, '${getVariableNameFromEntityName(relation.from)}_id'); }`;
//         case 'many-to-many':
//             return `public function ${toCase.snake(relation.toProp)}(): BelongsToMany { return $this->belongsToMany(${getClassNameFromEntityName(relation.from)}::class); }`;
//     }
// }