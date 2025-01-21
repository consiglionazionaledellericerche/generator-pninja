import to from 'to-case';
import pluralize from 'pluralize';
import jhipsterCore from 'jhipster-core';
import jclrz from 'json-colorz';
const { parseFromFiles } = jhipsterCore;
const tab = (n = 1) => (Array(n)).fill('    ').join('');


export class FactoriesGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseFromFiles([this.entitiesFilePath]);
    }

    generateFactories(n = 5) {
        const { enums, entities, relationships } = this.parsedJDL;
        for (const entity of entities) {
            const models = [`use App\\Models\\${entity.name};`];
            const params = entity.body.map(prop => `${tab(3)}'${to.snake(prop.name)}' => ${this._getFakerRule(prop)},`);
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne'
                && relation.to.name === entity.name
            )).forEach(relation => {
                models.push(`use App\\Models\\${relation.from.name};`)
                params.push(`${tab(3)}'${to.snake(relation.to.injectedField || relation.from.name)}_id' => function() {
                    if (${relation.from.name}::count() === 0) {
                        while(${relation.from.name}::count() < ${n}) ${relation.from.name}::factory()->create();
                    }
                    $ids${relation.from.name} = array_map(function($e) { return $e['id']; }, (${relation.from.name}::all(['id']))->toArray());
                    $ids${entity.name} = array_map(function($e) { return $e['${to.snake(relation.to.injectedField || relation.from.name)}_id']; }, (${entity.name}::all(['${to.snake(relation.to.injectedField || relation.from.name)}_id']))->toArray());
                    return $this->getRandomUniqueValue($ids${relation.from.name}, $ids${entity.name});
                },`);
            });
            this.that.fs.copyTpl(this.that.templatePath("EntityFactory.php.ejs"), this.that.destinationPath(`server/database/factories/${entity.name}Factory.php`),
                {
                    entityName: entity.name,
                    models: models.join("\n"),
                    params: params.join("\n"),
                });
        }
        this.that.fs.copyTpl(this.that.templatePath("DatabaseSeeder.php.ejs"), this.that.destinationPath(`server/database/seeders/DatabaseSeeder.php`),
            {
                entities,
                n,
            });
    }

    _getFakerRule(field) {
        const hasUnique = field.fieldValidateRules && field.fieldValidateRules.includes('unique');

        switch (field.type) {
            case 'String':
                if (field.name.toLowerCase().includes('email')) {
                    return 'fake()->unique()->safeEmail()';
                } else if (field.name.toLowerCase().includes('name')) {
                    return hasUnique ? 'fake()->unique()->name()' : 'fake()->name()';
                } else if (field.name.toLowerCase().includes('phone')) {
                    return hasUnique ? 'fake()->unique()->phoneNumber()' : 'fake()->phoneNumber()';
                } else if (field.name.toLowerCase().includes('address')) {
                    return 'fake()->address()';
                } else if (field.name.toLowerCase().includes('code') ||
                    field.name.toLowerCase().includes('codice')) {
                    return hasUnique ? 'fake()->unique()->bothify("??##??##")' : 'fake()->bothify("??##??##")';
                } else {
                    return hasUnique ? 'fake()->unique()->word()' : 'fake()->word()';
                }
            case 'Integer':
                if (field.fieldValidateRules) {
                    const min = field.fieldValidateRules.includes('min') ? field.fieldValidateRulesMin : 1;
                    const max = field.fieldValidateRules.includes('max') ? field.fieldValidateRulesMax : 100;
                    return `fake()->numberBetween(${min}, ${max})`;
                }
                return 'fake()->numberBetween(1, 100)';
            case 'Long':
                return 'fake()->numberBetween(1, 1000000)';
            case 'Float':
            case 'Double':
            case 'BigDecimal':
                return 'fake()->randomFloat(2, 0, 10000)';
            case 'Boolean':
                return 'fake()->boolean()';
            case 'LocalDate':
            case 'Date':
                return 'fake()->date()';
            case 'ZonedDateTime':
            case 'Instant':
                return 'fake()->dateTime()';
            case 'byte[]':
            case 'ByteBuffer':
                return 'fake()->sha256()';
            case 'TextBlob':
            case 'Blob':
                return 'fake()->text()';
            default:
                return 'fake()->word()';
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