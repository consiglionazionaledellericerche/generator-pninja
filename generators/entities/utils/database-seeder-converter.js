import fs from 'fs/promises';
import path from 'path';

export class DatabaseSeederConverter {
    constructor(outputDir = 'database/seeders') {
        this.outputDir = outputDir;
        this.entities = new Map();
    }

    async addEntity(jsonFilePath) {
        try {
            const jsonContent = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
            this.entities.set(jsonContent.name, {
                relationships: jsonContent.relationships || []
            });
        } catch (error) {
            throw error;
        }
    }

    _getDependencyOrder() {
        const visited = new Set();
        const ordered = new Set(); // Usa Set invece di array per evitare duplicati

        const visit = (entityName) => {
            if (visited.has(entityName)) return;
            visited.add(entityName);

            const entity = this.entities.get(entityName);
            if (entity) {
                for (const rel of entity.relationships) {
                    if (rel.relationshipType === 'many-to-one' ||
                        (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right')) {
                        visit(rel.otherEntityName);
                    }
                }
            }
            ordered.add(entityName);
        };

        for (const entityName of this.entities.keys()) {
            visit(entityName);
        }

        return Array.from(ordered);
    }

    async generateDatabaseSeeder() {
        const orderedEntities = this._getDependencyOrder();
        const content = this._generateSeederContent(orderedEntities);

        // Debug output
        console.log('Ordered entities:', orderedEntities);

        await fs.writeFile(
            path.join(this.outputDir, 'DatabaseSeeder.php'),
            content
        );
    }

    _generateSeederContent(orderedEntities) {
        const importStatements = new Set();
        const callStatements = new Set();

        orderedEntities.forEach(name => {
            const seederName = this._toPascalCase(name);
            importStatements.add(`use Database\\Seeders\\${seederName}Seeder;`);
            callStatements.add(`        $this->call(${seederName}Seeder::class);`);
        });

        const imports = Array.from(importStatements).sort().join('\n');
        const calls = Array.from(callStatements).join('\n');

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
${calls}
    }
}`;
    }

    _toPascalCase(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}