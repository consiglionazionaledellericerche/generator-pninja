import path from 'path';

export function getEntitiesFiles(that) {
    const pninjaDir = that.destinationPath('.pninja');
    const allFiles = that.fs.store.all();
    return allFiles
        .filter(file => file.path.startsWith(pninjaDir) && file.path.endsWith('.json') && path.basename(file.path) !== 'Entities.json');
}

export function getEntities(that) {
    return getEntitiesFiles(that)
        .map(file => JSON.parse(file.contents.toString('utf8')));
}

export function getEntitiesNames(that) {
    return getEntitiesFiles(that)
        .map(file => path.basename(file.path).replace('.json', ''));
}