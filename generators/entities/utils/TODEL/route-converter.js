import fs from 'fs/promises';
import path from 'path';
import pluralize from 'pluralize';

export class RouteConverter {
    constructor(outputDir = 'routes') {
        this.outputDir = outputDir;
        this.routeFiles = [];
    }

    async convertToRoutes(jsonFilePath) {
        try {
            const jsonContent = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
            const routeContent = this._generateRoutes(jsonContent);
            const routeFileName = `${this._toKebabCase(jsonContent.name)}.php`;

            // Aggiungi alla lista dei file di route
            this.routeFiles.push(routeFileName);

            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.writeFile(
                path.join(this.outputDir, routeFileName),
                routeContent
            );
        } catch (error) {
            throw error;
        }
    }

    async generateApiFile() {
        const apiContent = this._generateApiRoutes();
        await fs.writeFile(
            path.join(this.outputDir, 'api.php'),
            apiContent
        );
    }

    _generateRoutes(entity) {
        const resourceName = pluralize(this._toKebabCase(entity.name));

        return `<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\${entity.name}Controller;

Route::apiResource('${resourceName}', ${entity.name}Controller::class);
`;
    }

    _generateApiRoutes() {
        const imports = this.routeFiles
            .map(file => `require __DIR__ . '/${file}';`)
            .join('\n');

        return `<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group.
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

${imports}
`;
    }

    _toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
    }
}