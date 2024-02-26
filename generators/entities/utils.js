const fs = require('fs');

const to = require('to-case');

const getTableNameFromEntityName = (name) => `${to.snake(name)}s`;

const getClassNameFromEntityName = (name) => `${to.pascal(name)}`;

const getVariableNameFromEntityName = (name) => `${to.camel(name)}`;

const getRootPathFromEntityName = (name) => `${to.camel(name).toLowerCase()}s`;

const getAddColumnUp = (name, type) => {
    switch (type.toLowerCase()) {
        case 'string':
        return `\n\t\t\t$table->string('${name}', 255);`
        break;
        case 'unsignedbiginteger':
        return `\n\t\t\t$table->unsignedBigInteger('${name}');`
        break;
        
        default:
        return undefined;
        break;
    }
}
const getAddColumnDown = (name) => {
    return `\n\t\t\t$table->dropColumn('${name}');`
}

const getAddRelationUp = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'many-to-one':
        return `
        \t\t\t$table->foreign('${to.snake(relation.to)}_id')
        \t\t\t      ->references('id')
        \t\t\t      ->on('${getTableNameFromEntityName(relation.to)}')
        \t\t\t      ->onDelete('cascade');
        `
        break;
        
        default:
        return undefined;
        break;
    }
}
const getAddRelationDown = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'many-to-one':
        return `\t\t\t$table->dropForeign(['${to.snake(relation.to)}_id']);`
        break;
        
        default:
        return undefined;
        break;
    }
}

const getRelationPropertyOwner = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'many-to-one':
        return relation.from;
        break;
        
        default:
        return undefined;
        break;
    }
}
// const getRelationDestination = (relation) => {
//     switch (relation.type.toLowerCase()) {
//         case 'many-to-one':
//         return relation.to;
//         break;
        
//         default:
//         return undefined;
//         break;
//     }
// }
const getRelationPropertyName = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'many-to-one':
        return `${to.snake(relation.to)}_id`;
        break;
        
        default:
        return undefined;
        break;
    }
}

const getEntitiesAndRelations = (entitiesFilePath) => {
    const {entities, relations} = JSON.parse(fs.readFileSync(entitiesFilePath) || '{}');
    const res = {
        entities: [],
        properties: {},
        relations: {}
    }
    if(Array.isArray(entities)) {
        for (let index = 0; index < entities.length; index++) {
            const entity = entities[index];
            entityName = entity.name;
            res.entities.push(entityName);
            for(const col in entity.schema) {
                if(res.properties[entityName] === undefined) { res.properties[entityName] = []; }
                res.properties[entityName].push({name: col, type: entity.schema[col]});
            }            
        }
    }
    // Parsing relations from entities definition file
    if(Array.isArray(relations)) {
        for (let index = 0; index < relations.length; index++) {
            const relation = relations[index];
            const entityName = getRelationPropertyOwner(relation);
            if(res.entities[entityName] === undefined) { res.entities.push(entityName); }
            if(res.properties[entityName] === undefined) { res.properties[entityName] = []; }
            res.properties[entityName].push({name: getRelationPropertyName(relation), type: 'unsignedBigInteger'});
            if(res.relations[entityName] === undefined) { res.relations[entityName] = []; }
            res.relations[entityName].push(relation);
        }
    }
    return res;
}


module.exports = {
    getEntitiesAndRelations,
    getClassNameFromEntityName,
    getTableNameFromEntityName,
    getVariableNameFromEntityName,
    getRootPathFromEntityName,
    getAddColumnUp,
    getAddColumnDown,
    getAddRelationUp,
    getAddRelationDown,
    getRelationPropertyOwner,
    // getRelationDestination
}