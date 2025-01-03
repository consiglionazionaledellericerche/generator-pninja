import fs from 'fs/promises';
import path from 'path';
import pluralize from 'pluralize';

export class SeederConverter {
    constructor(outputDir = 'database/seeders') {
        this.outputDir = outputDir;
        this.recordsPerEntity = 10;
    }

    setRecordsPerEntity(count) {
        this.recordsPerEntity = count;
    }

    async convertToSeeder(jsonFilePath) {
        try {
            const jsonContent = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
            const seederContent = this._generateSeeder(jsonContent);
            const seederFileName = `${jsonContent.name}Seeder.php`;

            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.writeFile(
                path.join(this.outputDir, seederFileName),
                seederContent
            );
        } catch (error) {
            throw error;
        }
    }

    _generateSeeder(entity) {
        const relationships = this._getRequiredRelations(entity.relationships);
        const needsUniqueRelation = relationships.some(rel =>
            rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right'
        );

        const fakerMappings = this._generateFakerMappings(entity.fields);
        const relationMappings = this._generateRelationMappings(relationships);

        return `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;
use App\\Models\\${entity.name};
${this._generateImports(relationships)}
use Faker\\Factory as Faker;

class ${entity.name}Seeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create();

        // Get available IDs for relations
${this._generateIdQueries(relationships, needsUniqueRelation, entity)}

        foreach(range(1, ${this.recordsPerEntity}) as $index) {
            ${entity.name}::create([
${fakerMappings}${relationMappings}
            ]);
        }
    }
}`;
    }

    _generateImports(relationships) {
        return relationships
            .map(rel => `use App\\Models\\${this._upperFirst(rel.otherEntityName)};`)
            .join('\n');
    }

    _generateIdQueries(relationships, needsUniqueRelation, entityClass) {
        if (relationships.length === 0) return '';

        return relationships.map(rel => {
            const modelName = this._upperFirst(rel.otherEntityName);
            const varName = `${this._lowerFirst(modelName)}Ids`;

            if (needsUniqueRelation && rel.relationshipType === 'one-to-one') {
                return `        // Get unused IDs for one-to-one relation
        $used${modelName}Ids = ${entityClass.name}::pluck('${rel.relationshipName}_id')->toArray();
        $${varName} = ${modelName}::whereNotIn('id', $used${modelName}Ids)->pluck('id')->toArray();
        if (empty($${varName})) {
            // Create new records if needed
            $${varName} = [];
            for ($i = 0; $i < ${this.recordsPerEntity}; $i++) {
                $${varName}[] = ${modelName}::create([
                    'nome' => $faker->word(),
                    'codice' => $faker->unique()->regexify('[A-Z]{5}[0-9]{5}')
                ])->id;
            }
        }`;
            }

            return `        $${varName} = ${modelName}::pluck('id')->toArray();
        if (empty($${varName})) {
            // Create a default record if none exists
            $${varName}[] = ${modelName}::create([
                'nome' => $faker->word(),
                'codice' => $faker->unique()->regexify('[A-Z]{5}[0-9]{5}')
            ])->id;
        }`;
        }).join('\n\n');
    }

    _generateRelationMappings(relationships) {
        if (relationships.length === 0) return '';

        return '\n' + relationships.map(rel => {
            const modelName = this._upperFirst(rel.otherEntityName);
            const varName = `${this._lowerFirst(modelName)}Ids`;
            const mapping = rel.relationshipType === 'one-to-one' ?
                `array_shift($${varName})` :
                `$faker->randomElement($${varName})`;

            return `                '${rel.relationshipName}_id' => ${mapping},`;
        }).join('\n');
    }

    _getRequiredRelations(relationships) {
        if (!relationships) return [];

        return relationships.filter(rel =>
            rel.relationshipType === 'many-to-one' ||
            (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right')
        );
    }

    _generateFakerMappings(fields) {
        return fields
            .filter(field => !field.fieldName.endsWith('_id'))
            .map(field => {
                const fieldName = this._toSnakeCase(field.fieldName);
                const fakerValue = this._getFakerValue(field);
                return `                '${fieldName}' => ${fakerValue},`;
            }).join('\n');
    }

    _getFakerValue(field) {
        if (field.fieldValidateRules?.includes('unique')) {
            return this._getUniqueFakerValue(field);
        }
        return this._getRegularFakerValue(field);
    }

    _getUniqueFakerValue(field) {
        switch (field.fieldType) {
            case 'String':
                if (field.fieldName.toLowerCase().includes('email')) {
                    return '$faker->unique()->safeEmail';
                }
                if (field.fieldName.toLowerCase().includes('codice')) {
                    return '$faker->unique()->regexify("[A-Z]{5}[0-9]{5}")';
                }
                return '$faker->unique()->word';
            case 'Integer':
            case 'Long':
                return '$faker->unique()->numberBetween(1, 1000)';
            case 'BigDecimal':
            case 'Float':
            case 'Double':
                return '$faker->unique()->randomFloat(2, 1, 1000)';
            default:
                return '$faker->unique()->word';
        }
    }

    _getRegularFakerValue(field) {
        const hasMin = field.fieldValidateRules?.includes('min');
        const hasMax = field.fieldValidateRules?.includes('max');
        const min = hasMin ? field.fieldValidateRulesMin : 1;
        const max = hasMax ? field.fieldValidateRulesMax : 100;

        switch (field.fieldType) {
            case 'String':
                if (field.fieldName.toLowerCase().includes('nome')) {
                    return '$faker->firstName';
                }
                if (field.fieldName.toLowerCase().includes('cognome')) {
                    return '$faker->lastName';
                }
                if (field.fieldName.toLowerCase().includes('email')) {
                    return '$faker->safeEmail';
                }
                if (field.fieldName.toLowerCase().includes('phone')) {
                    return '$faker->phoneNumber';
                }
                if (field.fieldName.toLowerCase().includes('address')) {
                    return '$faker->address';
                }
                if (field.fieldName.toLowerCase().includes('company')) {
                    return '$faker->company';
                }
                if (field.fieldName.toLowerCase().includes('codice')) {
                    return '$faker->regexify("[A-Z]{5}[0-9]{5}")';
                }
                if (field.fieldName.toLowerCase().includes('descrizione')) {
                    return '$faker->text';
                }
                if (field.fieldName.toLowerCase().includes('titolo')) {
                    return '$faker->sentence';
                }
                if (field.fieldName.toLowerCase().includes('stato')) {
                    return '$faker->randomElement(["ATTIVO", "SOSPESO", "COMPLETATO"])';
                }
                return '$faker->word';

            case 'Integer':
            case 'Long':
                if (field.fieldName.toLowerCase().includes('budget')) {
                    return '$faker->numberBetween(1000, 100000)';
                }
                if (field.fieldName.toLowerCase().includes('livello') ||
                    field.fieldName.toLowerCase().includes('priorita')) {
                    return '$faker->numberBetween(1, 5)';
                }
                return `$faker->numberBetween(${min}, ${max})`;

            case 'BigDecimal':
            case 'Float':
            case 'Double':
                if (field.fieldName.toLowerCase().includes('budget')) {
                    return '$faker->randomFloat(2, 1000, 100000)';
                }
                return '$faker->randomFloat(2, 1, 1000)';

            case 'Boolean':
                return '$faker->boolean';

            case 'LocalDate':
                if (field.fieldName.toLowerCase().includes('scadenza')) {
                    return '$faker->dateTimeBetween("now", "+2 years")->format("Y-m-d")';
                }
                if (field.fieldName.toLowerCase().includes('rilascio')) {
                    return '$faker->dateTimeBetween("-1 year", "now")->format("Y-m-d")';
                }
                if (field.fieldName.toLowerCase().includes('assunzione')) {
                    return '$faker->dateTimeBetween("-5 years", "now")->format("Y-m-d")';
                }
                if (field.fieldName.toLowerCase().includes('fine')) {
                    return '$faker->dateTimeBetween("now", "+1 year")->format("Y-m-d")';
                }
                if (field.fieldName.toLowerCase().includes('inizio')) {
                    return '$faker->dateTimeBetween("-1 month", "now")->format("Y-m-d")';
                }
                return '$faker->date';

            case 'ZonedDateTime':
            case 'Instant':
                return '$faker->dateTime->format("Y-m-d H:i:s")';

            case 'byte[]':
            case 'TextBlob':
            case 'Blob':
                return '$faker->text';

            default:
                return '$faker->word';
        }
    }

    _toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }

    _upperFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    _lowerFirst(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
}