import fs from 'fs/promises';
import path from 'path';

export class FactoryConverter {
    constructor(outputDir = 'database/factories') {
        this.outputDir = outputDir;
    }

    async convertToFactory(jsonFilePath) {
        try {
            const jsonContent = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
            const factoryContent = this._generateFactory(jsonContent);
            const factoryFileName = `${jsonContent.name}Factory.php`;

            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.writeFile(
                path.join(this.outputDir, factoryFileName),
                factoryContent
            );
        } catch (error) {
            throw error;
        }
    }

    _generateFactory(entity) {
        const fakeData = this._generateFakeDataString(entity.fields);
        const { relations, relationsString } = this._getRequiredRelations(entity.relationships);
        const importsString = this._generateImportsString(entity, relations);

        return `<?php

namespace Database\\Factories;

use App\\Models\\${entity.name};
${importsString}use Illuminate\\Database\\Eloquent\\Factories\\Factory;

class ${entity.name}Factory extends Factory
{
    protected \$model = ${entity.name}::class;

    public function definition(): array
    {
        return [
${fakeData}${relationsString}        ];
    }
}`;
    }

    _generateImportsString(entity, relations) {
        if (!relations || relations.length === 0) return '';
        return relations
            .map(rel => `use App\\Models\\${rel.targetModel};`)
            .join('\n') + '\n';
    }

    _getRequiredRelations(relationships) {
        if (!relationships) return { relations: [], relationsString: '' };

        const relations = relationships
            .filter(rel =>
                rel.relationshipType === 'many-to-one' ||
                (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right')
            )
            .map(rel => ({
                fieldName: `${rel.relationshipName}_id`,
                targetModel: this._upperFirst(rel.otherEntityName)
            }));

        const relationsString = relations.length > 0
            ? relations
                .map(rel => `            '${rel.fieldName}' => ${rel.targetModel}::factory(),`)
                .join('\n') + '\n'
            : '';

        return { relations, relationsString };
    }

    _generateFakeDataString(fields) {
        if (!fields || fields.length === 0) return '';

        return fields
            .map(field => {
                const fieldName = this._toSnakeCase(field.fieldName);
                const fakerRule = this._getFakerRule(field);
                return `            '${fieldName}' => ${fakerRule},`;
            })
            .join('\n') + '\n';
    }

    _getFakerRule(field) {
        const hasUnique = field.fieldValidateRules && field.fieldValidateRules.includes('unique');

        switch (field.fieldType) {
            case 'String':
                if (field.fieldName.toLowerCase().includes('email')) {
                    return 'fake()->unique()->safeEmail()';
                } else if (field.fieldName.toLowerCase().includes('name')) {
                    return hasUnique ? 'fake()->unique()->name()' : 'fake()->name()';
                } else if (field.fieldName.toLowerCase().includes('phone')) {
                    return hasUnique ? 'fake()->unique()->phoneNumber()' : 'fake()->phoneNumber()';
                } else if (field.fieldName.toLowerCase().includes('address')) {
                    return 'fake()->address()';
                } else if (field.fieldName.toLowerCase().includes('code') ||
                    field.fieldName.toLowerCase().includes('codice')) {
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

    _toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }

    _upperFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}