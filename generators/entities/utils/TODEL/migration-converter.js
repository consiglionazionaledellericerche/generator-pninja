import fs from 'fs/promises';
import path from 'path';
import pluralize from 'pluralize';

export class MigrationConverter {
    constructor(outputDir = 'database/migrations') {
        this.outputDir = outputDir;
    }

    async convertToMigration(jsonFilePath) {
        try {
            const jsonContent = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
            const tableName = pluralize(jsonContent.name.toLowerCase());
            const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_presto_entity';

            // Creiamo prima la migrazione della tabella base (001)
            const tableMigration = this._generateTableMigration(jsonContent);
            const tableFileName = `${baseTimestamp}_001_create_${tableName}_table.php`;

            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.writeFile(
                path.join(this.outputDir, tableFileName),
                tableMigration
            );

            // Creiamo poi la migrazione per le foreign keys (002)
            if (jsonContent.relationships && jsonContent.relationships.length > 0) {
                const relationshipMigration = this._generateRelationshipMigration(jsonContent);
                const relationshipFileName = `${baseTimestamp}_002_add_relationships_to_${tableName}_table.php`;
                await fs.writeFile(
                    path.join(this.outputDir, relationshipFileName),
                    relationshipMigration
                );
            }

            // Infine creiamo le migrazioni per le tabelle pivot (003+)
            const pivotMigrations = this._generatePivotMigrations(jsonContent);
            let pivotCounter = 3;
            for (const [pivotName, migration] of Object.entries(pivotMigrations)) {
                const paddedCounter = String(pivotCounter).padStart(3, '0');
                const pivotFileName = `${baseTimestamp}_${paddedCounter}_create_${pivotName}_table.php`;
                await fs.writeFile(
                    path.join(this.outputDir, pivotFileName),
                    migration
                );
                pivotCounter++;
            }
        } catch (error) {
            throw error;
        }
    }

    _generateTableMigration(entity) {
        const tableName = pluralize(entity.name.toLowerCase());
        const fields = this._convertFields(entity.fields);

        return `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('${tableName}', function (Blueprint $table) {
            $table->id();
${fields}
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('${tableName}');
    }
};`;
    }

    _generateRelationshipMigration(entity) {
        const tableName = pluralize(entity.name.toLowerCase());
        const relationFields = this._convertRelationFields(entity.relationships);

        return `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('${tableName}', function (Blueprint $table) {
${relationFields}
        });
    }

    public function down()
    {
        Schema::table('${tableName}', function (Blueprint $table) {
${this._generateRelationFieldsDown(entity.relationships)}
        });
    }
};`;
    }

    _generatePivotMigrations(entity) {
        const pivotMigrations = {};
        const manyToManyRelations = entity.relationships.filter(rel =>
            rel.relationshipType === 'many-to-many' &&
            rel.relationshipSide === 'left'
        );

        for (const rel of manyToManyRelations) {
            const table1 = entity.name.toLowerCase();
            const table2 = rel.otherEntityName.toLowerCase();
            const pivotName = [table1, table2].sort().join('_');

            pivotMigrations[pivotName] = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('${pivotName}', function (Blueprint $table) {
            $table->id();
            $table->foreignId('${table1}_id')->constrained('${pluralize(table1)}');
            $table->foreignId('${table2}_id')->constrained('${pluralize(table2)}');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('${pivotName}');
    }
};`;
        }

        return pivotMigrations;
    }

    _convertFields(fields) {
        return fields.map(field => {
            const fieldName = this._toSnakeCase(field.fieldName);
            const fieldType = this._convertFieldType(field.fieldType);
            let fieldDefinition = `            $table->${fieldType}('${fieldName}')`;

            if (field.fieldValidateRules) {
                if (field.fieldValidateRules.includes('required')) {
                    // Nulla da aggiungere perché in Laravel i campi sono già 'required' per default
                } else {
                    fieldDefinition += '->nullable()';
                }

                if (field.fieldValidateRules.includes('unique')) {
                    fieldDefinition += '->unique()';
                }

                if (field.fieldValidateRules.includes('min')) {
                    fieldDefinition += `->min(${field.fieldValidateRulesMin})`;
                }

                if (field.fieldValidateRules.includes('max')) {
                    fieldDefinition += `->max(${field.fieldValidateRulesMax})`;
                }
            } else {
                fieldDefinition += '->nullable()';
            }

            return fieldDefinition + ';';
        }).join('\n');
    }

    _convertRelationFields(relationships) {
        if (!relationships || relationships.length === 0) return '';

        return relationships
            .filter(rel => {
                return (rel.relationshipType === 'many-to-one') ||
                    (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'left');
            })
            .map(rel => {
                const tableName = pluralize(rel.otherEntityName.toLowerCase());
                const fieldName = `${rel.relationshipName.toLowerCase()}_id`;
                let definition = `            $table->foreignId('${fieldName}')`;

                if (rel.relationshipType === 'one-to-one') {
                    definition += '->unique()';
                }

                definition += `->constrained('${tableName}');`;
                return definition;
            })
            .join('\n');
    }

    _generateRelationFieldsDown(relationships) {
        if (!relationships || relationships.length === 0) return '';

        return relationships
            .filter(rel => {
                return (rel.relationshipType === 'many-to-one') ||
                    (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right');
            })
            .map(rel => {
                const fieldName = `${rel.relationshipName.toLowerCase()}_id`;
                const tableName = pluralize(rel.otherEntityName.toLowerCase());
                return `            $table->dropForeign(['${fieldName}']);\n` +
                    `            $table->dropColumn('${fieldName}');`;
            })
            .join('\n\n');
    }

    _convertFieldType(jhipsterType) {
        const typeMap = {
            'String': 'string',
            'Integer': 'integer',
            'Long': 'bigInteger',
            'BigDecimal': 'decimal',
            'Float': 'float',
            'Double': 'double',
            'Boolean': 'boolean',
            'LocalDate': 'date',
            'ZonedDateTime': 'timestamp',
            'Instant': 'timestamp',
            'byte[]': 'binary',
            'TextBlob': 'text',
            'Blob': 'binary'
        };

        return typeMap[jhipsterType] || 'string';
    }

    _toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }
}