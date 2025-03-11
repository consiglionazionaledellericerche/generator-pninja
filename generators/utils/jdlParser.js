import jhipsterCore from 'jhipster-core';
const { parseFromFiles } = jhipsterCore;

export function parseJDL(entitiesFilePath) {
    if (!entitiesFilePath) return {
        "applications": [],
        "deployments": [],
        "constants": {},
        "entities": [],
        "relationships": [],
        "enums": [],
        "options": {}
    };
    const r = /^([^(]+)(?:\(([^)]+)\))?$/
    let parsedJDL = parseFromFiles([entitiesFilePath]);
    parsedJDL.relationships = (parsedJDL.relationships || []).map(relation => {
        let { from, to } = relation;
        if (from.injectedField && r.test(from.injectedField)) {
            const [m, injectedField, injectedFieldLabel] = from.injectedField.match(r);
            from.injectedField = injectedField;
            from.injectedFieldLabel = injectedFieldLabel ? injectedFieldLabel : 'id';
        } else {
            from.injectedFieldLabel = 'id';
        }
        if (to.injectedField && r.test(to.injectedField)) {
            const [, injectedField, injectedFieldLabel] = to.injectedField.match(r);
            to.injectedField = injectedField;
            to.injectedFieldLabel = injectedFieldLabel ? injectedFieldLabel : 'id';
        } else {
            to.injectedFieldLabel = 'id';
        }
        return { ...relation, from, to };
    });
    return parsedJDL;
}