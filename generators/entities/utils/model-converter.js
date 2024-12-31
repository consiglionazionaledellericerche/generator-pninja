import fs from 'fs/promises';
import path from 'path';
import pluralize from 'pluralize';

export class ModelConverter {
    constructor(outputDir = 'app/Models') {
        this.outputDir = outputDir;
    }

    async convertToModel(jsonFilePath) {
        try {
            const jsonContent = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
            const modelContent = this._generateModel(jsonContent);
            const modelFileName = `${jsonContent.name}.php`;

            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.writeFile(
                path.join(this.outputDir, modelFileName),
                modelContent
            );
        } catch (error) {
            throw error;
        }
    }

    _generateModel(entity) {
        const tableName = pluralize(entity.name.toLowerCase());
        const fillableFields = this._getFillableFields(entity.fields);
        const relationships = this._generateRelationships(entity.relationships);

        return `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;
use Illuminate\\Database\\Eloquent\\Relations\\HasOne;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsToMany;

class ${entity.name} extends Model
{
    protected $table = '${tableName}';

    protected $fillable = [${fillableFields}];

${relationships}
}`;
    }

    _getFillableFields(fields) {
        return fields
            .map(field => `'${this._toSnakeCase(field.fieldName)}'`)
            .join(', ');
    }

    _generateRelationships(relationships) {
        if (!relationships || relationships.length === 0) return '';

        return relationships.map(rel => {
            const methodName = rel.relationshipName;
            const targetModel = this._upperFirst(rel.otherEntityName);

            switch (rel.relationshipType) {
                case 'one-to-one':
                    if (rel.relationshipSide === 'right') {
                        return this._generateBelongsTo(methodName, targetModel);
                    } else {
                        return this._generateHasOne(methodName, targetModel);
                    }
                case 'many-to-one':
                    return this._generateBelongsTo(methodName, targetModel);
                case 'one-to-many':
                    return this._generateHasMany(methodName, targetModel);
                case 'many-to-many':
                    return this._generateBelongsToMany(methodName, targetModel);
                default:
                    return '';
            }
        }).join('\n\n');
    }

    _generateBelongsTo(methodName, targetModel) {
        return `    public function ${methodName}(): BelongsTo
    {
        return $this->belongsTo(${targetModel}::class);
    }`;
    }

    _generateHasOne(methodName, targetModel) {
        return `    public function ${methodName}(): HasOne
    {
        return $this->hasOne(${targetModel}::class);
    }`;
    }

    _generateHasMany(methodName, targetModel) {
        return `    public function ${methodName}(): HasMany
    {
        return $this->hasMany(${targetModel}::class);
    }`;
    }

    _generateBelongsToMany(methodName, targetModel) {
        const pivotTable = [this._lowerFirst(targetModel), methodName].sort().join('_');
        return `    public function ${methodName}(): BelongsToMany
    {
        return $this->belongsToMany(${targetModel}::class, '${pivotTable}');
    }`;
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