import path from 'path';
import fs from 'fs';

/**
 * Get a specific file from .pninja directory (mem-fs with filesystem fallback)
 * @param {Object} that - Yeoman generator instance
 * @param {string} fileName - Name of the file to retrieve
 * @returns {Object|null} File object with path and contents, or null if not found
 */
function getPninjaFile(that, fileName) {
    const pninjaDir = that.destinationPath('.pninja');
    const filePath = path.join(pninjaDir, fileName);

    // Try mem-fs first
    const allFiles = that.fs.store.all();
    const memFsFile = allFiles.find(file => file.path === filePath);

    if (memFsFile) {
        return memFsFile;
    }

    // Fallback to filesystem
    if (fs.existsSync(filePath)) {
        return {
            path: filePath,
            contents: fs.readFileSync(filePath)
        };
    }

    return null;
}

/**
 * Get a specific entity by name
 * @param {Object} that - Yeoman generator instance
 * @param {string} entityName - Name of the entity to retrieve
 * @returns {Object|null} Entity object or null if not found
 */
export function getEntity(that, entityName) {
    const file = getPninjaFile(that, `${entityName}.json`);

    if (!file) {
        return null;
    }

    return JSON.parse(file.contents.toString('utf8'));
}

function getPninjaFiles(that) {
    const pninjaDir = that.destinationPath('.pninja');
    const filesMap = new Map();

    // First, get all filesystem files
    if (fs.existsSync(pninjaDir)) {
        const files = fs.readdirSync(pninjaDir);
        files.forEach(file => {
            const filePath = path.join(pninjaDir, file);
            filesMap.set(filePath, {
                path: filePath,
                contents: fs.readFileSync(filePath)
            });
        });
    }

    // Then, override with mem-fs files (they have priority)
    const allFiles = that.fs.store.all();
    const memFsFiles = allFiles.filter(file => file.path.startsWith(pninjaDir));
    memFsFiles.forEach(file => {
        filesMap.set(file.path, file);
    });

    return Array.from(filesMap.values());
}

export function getEntityByName(that, entityName) {
    return getEntities(that).find(entity => entity.name === entityName) || null;
}

export function getEntitiesFiles(that) {
    return getPninjaFiles(that).filter(file => file.path.endsWith('.json') && !file.path.endsWith('.enum.json'));
}

export function getEnumsFiles(that) {
    return getPninjaFiles(that).filter(file => file.path.endsWith('.enum.json'));
}

export function getEntities(that) {
    return getEntitiesFiles(that).map(file => JSON.parse(file.contents.toString('utf8')));
}

export function getEntitiesNames(that) {
    return getEntitiesFiles(that).map(file => path.basename(file.path).replace('.json', ''));
}

export function getEntitiesTableNames(that) {
    return getEntities(that).map(entity => entity.tableName);
}

export function getEnums(that) {
    return getEnumsFiles(that).map(file => JSON.parse(file.contents.toString('utf8')));
}

export function getEnumsNames(that) {
    return getEnumsFiles(that).map(file => path.basename(file.path).replace('.enum.json', ''));
}

export function getEntitiesRelationships(that) {
    return getEntities(that).flatMap(entity =>
        (entity.relationships || []).map(rel => ({
            entityName: entity.name,
            ...rel
        }))
    );
}