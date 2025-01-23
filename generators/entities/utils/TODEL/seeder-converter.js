import fs from 'fs/promises';
import path from 'path';
import pluralize from 'pluralize';

export class SeederConverter {
    constructor(outputDir = 'database/seeders') {
        this.outputDir = outputDir;
    }

    async generateDatabaseSeeder(jsonDirectory) {
        try {
            const files = await fs.readdir(jsonDirectory);
            const entityFiles = files.filter(file => file.endsWith('.json'));

            const entities = await Promise.all(
                entityFiles.map(async file => {
                    const content = await fs.readFile(path.join(jsonDirectory, file), 'utf8');
                    return JSON.parse(content);
                })
            );

            const orderedEntities = this._orderEntitiesByDependencies(entities);
            const seederContent = this._generateSeeder(orderedEntities);

            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.writeFile(
                path.join(this.outputDir, 'DatabaseSeeder.php'),
                seederContent
            );
        } catch (error) {
            throw error;
        }
    }

    _orderEntitiesByDependencies(entities) {
        const availableEntities = new Set(entities.map(e => e.name));
        const graph = new Map();

        entities.forEach(entity => {
            graph.set(entity.name, {
                entity,
                dependencies: new Set()
            });
        });

        entities.forEach(entity => {
            if (entity.relationships) {
                entity.relationships.forEach(rel => {
                    if (availableEntities.has(rel.otherEntityName)) {
                        if (rel.relationshipType === 'many-to-one' ||
                            (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right')) {
                            const node = graph.get(entity.name);
                            if (node) {
                                node.dependencies.add(rel.otherEntityName);
                            }
                        }
                    }
                });
            }
        });

        const visited = new Set();
        const temp = new Set();
        const order = [];

        function visit(name) {
            if (temp.has(name)) {
                throw new Error(`Dipendenza ciclica rilevata per l'entità: ${name}`);
            }
            if (visited.has(name)) return;

            temp.add(name);
            const node = graph.get(name);
            if (node && node.dependencies) {
                for (const dep of node.dependencies) {
                    visit(dep);
                }
            }
            temp.delete(name);
            visited.add(name);
            const entity = graph.get(name)?.entity;
            if (entity) {
                order.unshift(entity);
            }
        }

        for (const name of graph.keys()) {
            if (!visited.has(name)) {
                visit(name);
            }
        }

        return order;
    }

    _generateSeeder(entities) {
        const imports = entities
            .map(entity => `use App\\Models\\${entity.name};`)
            .reduce((acc, curr) => acc.includes(curr) ? acc : [...acc, curr], []) // unique
            .join('\n');

        const seedEntities = entities
            .map(entity => this._generateEntitySeed(entity))
            .join('\n\n');

        const manyToManySeedEntities = entities
            .map(entity => this._generateManyToManySeed(entity))
            .filter(Boolean)
            .join('\n\n');

        return `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;
${imports}

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Creazione entità principali
${seedEntities}

        // Popolamento relazioni many-to-many
${manyToManySeedEntities}
    }
}`;
    }

    _generateEntitySeed(entity) {
        const varName = `$${this._pluralize(this._lowerFirst(entity.name))}`;
        return `        ${varName} = ${entity.name}::factory()
            ->count(5)
            ->create();`;
    }

    _generateManyToManySeed(entity) {
        if (!entity.relationships) return null;

        const manyToManyRelations = entity.relationships.filter(
            rel => rel.relationshipType === 'many-to-many' && rel.relationshipSide === 'left'
        );

        if (manyToManyRelations.length === 0) return null;

        const seedLines = manyToManyRelations.map(rel => {
            const sourceVar = `$${this._pluralize(this._lowerFirst(entity.name))}`;
            const targetVar = `$${this._pluralize(this._lowerFirst(rel.otherEntityName))}`;

            return `        ${sourceVar}->each(function ($${this._lowerFirst(entity.name)}) use (${targetVar}) {
            $${this._lowerFirst(entity.name)}->${rel.relationshipName}()->attach(
                ${targetVar}->random(2)->pluck('id')->toArray()
            );
        });`;
        });

        return seedLines.join('\n\n');
    }

    _lowerFirst(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    _pluralize(str) {
        return pluralize(str);
    }
}