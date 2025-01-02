import fs from 'fs/promises';
import path from 'path';

export class ControllerConverter {
    constructor(outputDir = 'app/Http/Controllers') {
        this.outputDir = outputDir;
    }

    async convertToController(jsonFilePath) {
        try {
            const jsonContent = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
            const controllerContent = this._generateController(jsonContent);
            const controllerFileName = `${jsonContent.name}Controller.php`;

            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.writeFile(
                path.join(this.outputDir, controllerFileName),
                controllerContent
            );
        } catch (error) {
            throw error;
        }
    }

    _generateController(entity) {
        const validationRules = this._generateValidationRules(entity.fields, entity.relationships);
        const modelVar = this._lowerFirst(entity.name);
        const relations = this._getRelationNames(entity.relationships);
        const withRelations = relations.length > 0 ? `with([${relations.map(r => `'${r}'`).join(', ')}])` : '';

        return `<?php

namespace App\\Http\\Controllers;

use App\\Models\\${entity.name};
use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Support\\Facades\\{DB, Validator};
use Illuminate\\Validation\\ValidationException;

class ${entity.name}Controller extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $${modelVar}s = ${entity.name}::${withRelations}get();
        return response()->json($${modelVar}s);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
${validationRules}
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            return DB::transaction(function () use ($request) {
                $${modelVar} = ${entity.name}::create($request->except([${relations.map(r => `'${r}'`).join(', ')}]));

${this._generateRelationSync(entity.relationships, modelVar)}
                return response()->json($${modelVar}->load([${relations.map(r => `'${r}'`).join(', ')}]), 201);
            });
        } catch (\\Exception $e) {
            return response()->json(['message' => 'Error creating resource', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $${modelVar} = ${entity.name}::${withRelations}findOrFail($id);
            return response()->json($${modelVar});
        } catch (\\Exception $e) {
            return response()->json(['message' => 'Resource not found', 'error' => $e->getMessage()], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
${validationRules}
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            return DB::transaction(function () use ($request, $id) {
                $${modelVar} = ${entity.name}::findOrFail($id);
                $${modelVar}->update($request->except([${relations.map(r => `'${r}'`).join(', ')}]));

${this._generateRelationSync(entity.relationships, modelVar)}
                return response()->json($${modelVar}->load([${relations.map(r => `'${r}'`).join(', ')}]));
            });
        } catch (\\Exception $e) {
            return response()->json(['message' => 'Error updating resource', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            return DB::transaction(function () use ($id) {
                $${modelVar} = ${entity.name}::findOrFail($id);
                $${modelVar}->delete();
                return response()->json(null, 204);
            });
        } catch (\\Exception $e) {
            return response()->json(['message' => 'Error deleting resource', 'error' => $e->getMessage()], 500);
        }
    }
}`;
    }

    _generateValidationRules(fields, relationships) {
        let rules = fields.map(field => {
            const fieldRules = [];
            const fieldName = this._toSnakeCase(field.fieldName);

            if (field.fieldValidateRules) {
                if (field.fieldValidateRules.includes('required')) {
                    fieldRules.push('required');
                }
                if (field.fieldValidateRules.includes('unique')) {
                    fieldRules.push('unique');
                }
                if (field.fieldValidateRules.includes('min')) {
                    fieldRules.push(`min:${field.fieldValidateRulesMin}`);
                }
                if (field.fieldValidateRules.includes('max')) {
                    fieldRules.push(`max:${field.fieldValidateRulesMax}`);
                }
            } else {
                fieldRules.push('nullable');
            }

            switch (field.fieldType) {
                case 'Integer':
                case 'Long':
                    fieldRules.push('integer');
                    break;
                case 'BigDecimal':
                case 'Float':
                case 'Double':
                    fieldRules.push('numeric');
                    break;
                case 'Boolean':
                    fieldRules.push('boolean');
                    break;
                case 'LocalDate':
                case 'ZonedDateTime':
                case 'Instant':
                    fieldRules.push('date');
                    break;
                default:
                    fieldRules.push('string');
            }

            return `            '${fieldName}' => ['${fieldRules.join("', '")}'],`;
        });

        // Regole per relazioni many-to-one e one-to-one
        const relationRules = relationships
            .filter(rel => rel.relationshipType === 'many-to-one' ||
                (rel.relationshipType === 'one-to-one' && rel.relationshipSide === 'right'))
            .map(rel => {
                const fieldName = `${rel.relationshipName}_id`;
                return `            '${fieldName}' => ['required', 'exists:${this._pluralize(rel.otherEntityName)},id'],`;
            });

        // Regole per array di ID nelle relazioni many-to-many
        const manyToManyRules = relationships
            .filter(rel => rel.relationshipType === 'many-to-many')
            .map(rel => {
                const fieldName = `${rel.relationshipName}`;
                return `            '${fieldName}' => ['array'],\n` +
                    `            '${fieldName}.*' => ['exists:${this._pluralize(rel.otherEntityName)},id'],`;
            });

        // Regole per array di dati nelle relazioni one-to-many
        const oneToManyRules = relationships
            .filter(rel => rel.relationshipType === 'one-to-many')
            .map(rel => {
                const fieldName = `${rel.relationshipName}`;
                return `            '${fieldName}' => ['array'],\n` +
                    `            '${fieldName}.*.id' => ['sometimes', 'exists:${this._pluralize(rel.otherEntityName)},id'],`;
            });

        return [...rules, ...relationRules, ...manyToManyRules, ...oneToManyRules].join('\n');
    }

    _generateRelationSync(relationships, modelVar) {
        const syncs = [];

        // Gestione many-to-many
        const manyToManySyncs = relationships
            .filter(rel => rel.relationshipType === 'many-to-many')
            .map(rel => {
                const relationName = rel.relationshipName;
                return `                if ($request->has('${relationName}')) {
                    $${modelVar}->${relationName}()->sync($request->input('${relationName}'));
                }`;
            });

        // Gestione one-to-many
        const oneToManySyncs = relationships
            .filter(rel => rel.relationshipType === 'one-to-many')
            .map(rel => {
                const relationName = rel.relationshipName;
                const entityName = rel.otherEntityName;
                return `                if ($request->has('${relationName}')) {
                    ${relationName}Data = collect($request->input('${relationName}'));
                    
                    // Aggiorna o crea nuovi record
                    ${modelVar}->${relationName}()->upsert(
                        ${relationName}Data->map(function ($item) use (${modelVar}) {
                            return $item + ['${modelVar}_id' => ${modelVar}->id];
                        })->toArray(),
                        ['id'],
                        array_keys(${relationName}Data->first())
                    );

                    // Elimina record non più presenti
                    ${modelVar}->${relationName}()
                        ->whereNotIn('id', ${relationName}Data->pluck('id')->filter())
                        ->delete();
                }`;
            });

        return [...manyToManySyncs, ...oneToManySyncs].join('\n\n');
    }

    _getRelationNames(relationships) {
        if (!relationships) return [];
        return relationships.map(rel => rel.relationshipName);
    }

    _toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }

    _lowerFirst(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    _pluralize(str) {
        return str.toLowerCase() + 's'; // Semplificato, considera di usare una libreria di pluralizzazione
    }
}