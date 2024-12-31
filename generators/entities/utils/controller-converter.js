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
        const validationRules = this._generateValidationRules(entity.fields);
        const modelVar = this._lowerFirst(entity.name);

        return `<?php

namespace App\\Http\\Controllers;

use App\\Models\\${entity.name};
use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Support\\Facades\\Validator;

class ${entity.name}Controller extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $${modelVar}s = ${entity.name}::all();
        return response()->json($${modelVar}s);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
${validationRules}
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $${modelVar} = ${entity.name}::create($request->all());
        return response()->json($${modelVar}, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id): JsonResponse
    {
        $${modelVar} = ${entity.name}::findOrFail($id);
        return response()->json($${modelVar});
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $${modelVar} = ${entity.name}::findOrFail($id);

        $validator = Validator::make($request->all(), [
${validationRules}
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $${modelVar}->update($request->all());
        return response()->json($${modelVar});
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $${modelVar} = ${entity.name}::findOrFail($id);
        $${modelVar}->delete();
        return response()->json(null, 204);
    }
}`;
    }

    _generateValidationRules(fields) {
        return fields.map(field => {
            const rules = [];
            const fieldName = this._toSnakeCase(field.fieldName);

            if (field.fieldValidateRules) {
                if (field.fieldValidateRules.includes('required')) {
                    rules.push('required');
                }
                if (field.fieldValidateRules.includes('unique')) {
                    rules.push('unique');
                }
                if (field.fieldValidateRules.includes('min')) {
                    rules.push(`min:${field.fieldValidateRulesMin}`);
                }
                if (field.fieldValidateRules.includes('max')) {
                    rules.push(`max:${field.fieldValidateRulesMax}`);
                }
            } else {
                rules.push('nullable');
            }

            // Aggiungi regole basate sul tipo di campo
            switch (field.fieldType) {
                case 'Integer':
                case 'Long':
                    rules.push('integer');
                    break;
                case 'BigDecimal':
                case 'Float':
                case 'Double':
                    rules.push('numeric');
                    break;
                case 'Boolean':
                    rules.push('boolean');
                    break;
                case 'LocalDate':
                case 'ZonedDateTime':
                case 'Instant':
                    rules.push('date');
                    break;
                default:
                    rules.push('string');
            }

            return `            '${fieldName}' => ['${rules.join("', '")}'],`;
        }).join('\n');
    }

    _toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    }

    _lowerFirst(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
}