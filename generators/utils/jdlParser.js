import jhipsterCore from 'jhipster-core';
const { parseFromFiles } = jhipsterCore;

export function parseJDL(entitiesFilePath) {
    let parsedJDL = parseFromFiles([entitiesFilePath]);
    return parsedJDL;
}