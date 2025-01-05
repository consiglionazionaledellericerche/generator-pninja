import fs from 'fs/promises';
import path from 'path';
import pluralize from 'pluralize';

export class FactorySeederConverter {
    constructor(outputDir = 'database') {
        this.outputDir = outputDir;
        this.entities = new Map(); // Mappa per tenere traccia di tutte le entità
        this.dependencies = new Map(); // Mappa per le dipendenze
    }

    async convertToFactoryAndSeeder(jsonDirectory) {
        try {
            // Leggi tutti i file JSON dalla directory
            const files = await fs.readdir(jsonDirectory);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            // Prima passsata: raccoglie informazioni su tutte le entità
            for (const file of jsonFiles) {
                const content = await fs.readFile(path.join(jsonDirectory, file), 'utf8');
                const entity = JSON.parse(content);
                this.entities.set(entity.name, entity);
                this.analyzeDependencies(entity);
            }

            // Genera le factories
            const factoryDir = path.join(this.outputDir, 'factories');
            await fs.mkdir(factoryDir, { recursive: true });

            for (const entity of this.entities.values()) {
                const factoryContent = this._generateFactory(entity);
                await fs.writeFile(
                    path.join(factoryDir, `${entity.name}Factory.php`),
                    factoryContent
                );
            }

            // Genera il DatabaseSeeder
            const seederContent = this._generateDatabaseSeeder();
            const seederDir = path.join(this.outputDir, 'seeders');
            await fs.mkdir(seederDir, { recursive: true });
            await fs.writeFile(
                path.join(seederDir, 'DatabaseSeeder.php'),
                seederContent
            );

        } catch (error) {
            throw error;
        }
    }

    analyzeDependencies(entity) {
        const deps = [];
        if (entity.relationships) {
            for (const rel of entity.relationships) {
                if (rel.relationshipType === 'many-to-one' ||
                    (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right')) {
                    deps.push(rel.otherEntityName);
                }
            }
        }
        this.dependencies.set(entity.name, deps);
    }

    _generateFactory(entity) {
        const defaultValues = this._generateDefaultValues(entity.fields);

        return `<?php

namespace Database\\Factories;

use App\\Models\\${entity.name};
use Illuminate\\Database\\Eloquent\\Factories\\Factory;

class ${entity.name}Factory extends Factory
{
    protected $model = ${entity.name}::class;

    public function definition(): array
    {
        return [
${defaultValues}
        ];
    }
}`;
    }

    _generateDefaultValues(fields) {
        return fields.map(field => {
            const name = this._toSnakeCase(field.fieldName);
            let value = this._getDefaultValueByType(field.fieldType);
            return `            '${name}' => ${value},`;
        }).join('\n');
    }

    _getDefaultValueByType(type) {
        switch (type) {
            case 'String':
                return "fake()->randomElement(['Aaaaa', 'Bbbbb', 'Ccccc', 'Ddddd', 'Eeeee'])";
            case 'Integer':
            case 'Long':
                return "fake()->numberBetween(10000, 99999)";
            case 'BigDecimal':
            case 'Float':
            case 'Double':
                return "fake()->randomFloat(2, 100, 10000)";
            case 'Boolean':
                return "fake()->boolean()";
            case 'LocalDate':
            case 'Instant':
                return "fake()->dateTimeThisYear()";
            default:
                return "'default_value'";
        }
    }

    _generateDatabaseSeeder() {
        const sortedEntities = this._topologicalSort();
        const manyToManyRelations = this._collectManyToManyRelations();

        let seederContent = `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\DB;
${this._generateModelImports()}

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Creazione entità in ordine di dipendenza
${this._generateEntityCreation(sortedEntities)}

        // Popolamento relazioni many-to-many
${this._generateManyToManyPopulation(manyToManyRelations)}
    }
}`;

        return seederContent;
    }

    _generateModelImports() {
        return Array.from(this.entities.keys())
            .map(name => `use App\\Models\\${name};`)
            .join('\n');
    }

    _generateEntityCreation(sortedEntities) {
        return sortedEntities
            .map(entityName => {
                return `        ${entityName}::factory()->count(5)->create();`;
            })
            .join('\n');
    }

    _generateManyToManyPopulation(relations) {
        return relations.map(({ entity, relation }) => {
            const tableName = this._getManyToManyTableName(entity, relation.otherEntityName);
            return `        // Popola la relazione many-to-many per ${entity} e ${relation.otherEntityName}
        ${entity}::all()->each(function($item) {
            $item->${relation.relationshipName}()->attach(
                ${relation.otherEntityName}::inRandomOrder()->limit(2)->pluck('id')
            );
        });`;
        }).join('\n\n');
    }

    _getManyToManyTableName(entity1, entity2) {
        return [entity1, entity2].sort().map(e => e.toLowerCase()).join('_');
    }

    _topologicalSort() {
        const visited = new Set();
        const temp = new Set();
        const order = [];

        const visit = (entity) => {
            if (temp.has(entity)) throw new Error("Ciclo di dipendenze rilevato");
            if (visited.has(entity)) return;

            temp.add(entity);

            const deps = this.dependencies.get(entity) || [];
            for (const dep of deps) {
                visit(dep);
            }

            temp.delete(entity);
            visited.add(entity);
            order.push(entity);
        };

        for (const entity of this.entities.keys()) {
            if (!visited.has(entity)) {
                visit(entity);
            }
        }

        return order;
    }

    _collectManyToManyRelations() {
        const relations = [];
        for (const [entityName, entity] of this.entities) {
            if (entity.relationships) {
                for (const rel of entity.relationships) {
                    if (rel.relationshipType === 'many-to-many' && rel.relationshipSide === 'left') {
                        relations.push({ entity: entityName, relation: rel });
                    }
                }
            }
        }
        return relations;
    }

    _toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}