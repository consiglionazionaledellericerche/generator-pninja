import to from 'to-case';
import pluralize from 'pluralize';
import { parseJDL } from '../../utils/jdlParser.js';
export class ModelsGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseJDL(this.entitiesFilePath);
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
                (relation.cardinality === 'OneToOne' || relation.cardinality === 'OneToMany')
                && relation.to.name === entity.name
            )).forEach(relation => {
                fillable.push(`'${to.snake(relation.to.injectedField || relation.from.name)}_id'`);
            });
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne' && relation.from.name === entity.name
            )).forEach(relation => {
                fillable.push(`'${to.snake(relation.from.injectedField || relation.to.name)}_id'`);
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
                relations.push(`public function ${to.snake(relation.from.injectedField || relation.to.name)}(): BelongsToMany { return $this->belongsToMany(${relation.to.name}::class, '${[to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_')}', '${to.snake(relation.to.injectedField || relation.from.name)}_id', '${to.snake(relation.from.injectedField || relation.to.name)}_id'); }`);
            });

            // ManyToMany reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                relations.push(`public function ${to.snake(relation.to.injectedField || relation.from.name)}(): BelongsToMany { return $this->belongsToMany(${relation.from.name}::class, '${[to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_')}', '${to.snake(relation.from.injectedField || relation.to.name)}_id', '${to.snake(relation.to.injectedField || relation.froom.name)}_id'); }`);
            });

            this.that.fs.copyTpl(this.that.templatePath("Entity.php.ejs"), this.that.destinationPath(`server/app/Models/${className}.php`),
                {
                    className,
                    tableName,
                    fillable: fillable.join(', '),
                    relations: relations.join(`\n${this.tab(1)}`),
                    enums: enums.filter(e => entity.body.map(f => f.type).includes(e.name)).map(e => e.name),
                    casts: enums.filter(e => entity.body.map(f => f.type).includes(e.name)).map(e => {
                        return {
                            attrsName: entity.body.filter(f => f.type === e.name).map(f => to.snake(f.name)),
                            className: e.name
                        }
                    }),
                });
        }
        for (const enm of enums) {
            this.that.fs.copyTpl(this.that.templatePath("Enum.php.ejs"), this.that.destinationPath(`server/app/Enums/${enm.name}.php`), {
                name: enm.name,
                values: enm.values,
            })
        }
    }
}