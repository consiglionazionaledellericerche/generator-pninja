import path from 'path';
import fs from 'fs';

/**
 * Get all files from .pninja directory (mem-fs with filesystem fallback)
 * @param {Object} that - Yeoman generator instance
 * @returns {Array} Array of file objects with path and contents
 */
function getPninjaFiles(that) {
    const pninjaDir = that.destinationPath('.pninja');

    // Try mem-fs first
    const allFiles = that.fs.store.all();
    const memFsFiles = allFiles.filter(file => file.path.startsWith(pninjaDir));

    // If found in mem-fs, return those
    if (memFsFiles.length > 0) {
        return memFsFiles;
    }

    // Fallback to filesystem
    if (fs.existsSync(pninjaDir)) {
        const files = fs.readdirSync(pninjaDir);
        return files.map(file => ({
            path: path.join(pninjaDir, file),
            contents: fs.readFileSync(path.join(pninjaDir, file))
        }));
    }

    return [];
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