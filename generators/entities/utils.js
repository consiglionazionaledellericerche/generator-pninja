const fs = require('fs');

const pluralize = require('pluralize')

const toCase = require('to-case');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const entitiesWriter = createCsvWriter({
    path: './.presto-entities.csv',
    header: [
        {id: 'name', title: 'name'},
        {id: 'class', title: 'class'},
        {id: 'table', title: 'table'},
        {id: 'variable', title: 'variable'},
        {id: 'path', title: 'path'}
    ]
});
const propertiesWriter = createCsvWriter({
    path: './.presto-properties.csv',
    header: [
        {id: 'entity', title: 'entity'},
        {id: 'column', title: 'column'},
        {id: 'type', title: 'type'},
    ]
});
const relationsWriter = createCsvWriter({
    path: './.presto-relations.csv',
    header: [
        {id: 'type', title: 'type'},
        {id: 'from', title: 'from'},
        {id: 'to', title: 'to'},
    ]
});


const getTableNameFromEntityName = (name) => `${toCase.snake(pluralize(name))}`;

const getClassNameFromEntityName = (name) => `${toCase.pascal(name)}`;

const getVariableNameFromEntityName = (name) => `${toCase.camel(name)}`;

const getRootPathFromEntityName = (name) => `${toCase.camel(pluralize(name)).toLowerCase()}`;

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
        case 'one-to-one':
        case 'many-to-one':
        return `
        \t\t\t$table->foreign('${toCase.snake(relation.to)}_id')
        \t\t\t      ->references('id')
        \t\t\t      ->on('${getTableNameFromEntityName(relation.to)}')
        \t\t\t      ->onDelete('cascade');
        `
        break;
        case 'one-to-many':
        return `
        \t\t\t$table->foreign('${toCase.snake(relation.from)}_id')
        \t\t\t      ->references('id')
        \t\t\t      ->on('${getTableNameFromEntityName(relation.from)}')
        \t\t\t      ->onDelete('cascade');
        `        
        default:
        return undefined;
        break;
    }
}
const getAddRelationDown = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'one-to-one':
        case 'many-to-one':
        return `\t\t\t$table->dropForeign(['${toCase.snake(relation.to)}_id']);`
        break;
        case 'one-to-many':
        return `\t\t\t$table->dropForeign(['${toCase.snake(relation.from)}_id']);`
        break;
        default:
        return undefined;
        break;
    }
}

const getRelationPropertyOwner = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'one-to-one':
        case 'many-to-one':
        return relation.from;
        break
        case 'one-to-many':
        return relation.to;
        break;
        default:
        return undefined;
        break;
    }
}
const getRelationDestination = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'one-to-one':
        case 'many-to-one':
        return relation.to;
        break;
        case 'one-to-many':
        return relation.from;
        break;
        default:
        return undefined;
        break;
    }
}
const getRelationPropertyName = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'one-to-one':
        case 'many-to-one':
        return `${toCase.snake(relation.to)}_id`;
        break;
        case 'one-to-many':
        return `${toCase.snake(relation.from)}_id`;
        break;
        default:
        return undefined;
        break;
    }
}
const getRelationForModel = (relation) => {
    switch (relation.type) {
        case 'many-to-one':
            return `public function ${getVariableNameFromEntityName(relation.to)}() { return $this->belongsTo(${getClassNameFromEntityName(relation.to)}::class); }`
            break;
        case 'one-to-many':
            return `public function ${getVariableNameFromEntityName(relation.from)}() { return $this->belongsTo(${getClassNameFromEntityName(relation.from)}::class); }`
            break;
        default:
            return `// TODO ${JSON.stringify(relation)}`;
            break;
    }
}

const writeEntitiesAndRelationsCSV = async (entitiesFilePath) => {
    const {entities, relations} = JSON.parse(fs.readFileSync(entitiesFilePath) || '{}');
    const es = [];
    const ps = [];
    const rs = [];
    if(Array.isArray(entities)) {
        for (let index = 0; index < entities.length; index++) {
            const entity = entities[index];
            entityName = entity.name;
            entitySchema = entity.schema;
            es.push({
                name: entityName,
                class: getClassNameFromEntityName(entityName),
                table: getTableNameFromEntityName(entityName),
                variable: getVariableNameFromEntityName(entityName),
                path: getRootPathFromEntityName(entityName)
            });
            for(const col in entitySchema) {
                ps.push({entity: entityName, column: col, type: entitySchema[col]});
            }
        }
    }
    if(Array.isArray(relations)) {
        for (let index = 0; index < relations.length; index++) {
            let {type, from, to} = relations[index];
            type = type.toLowerCase();
            rs.push({type, from, to});
            switch (type) {
                case 'one-to-one':
                    ps.push({entity: from, column: `${toCase.snake(to)}_id`, type: 'UnsignedBigInteger'});
                    break;
                case 'many-to-one':
                    ps.push({entity: from, column: `${toCase.snake(to)}_id`, type: 'UnsignedBigInteger'});
                    break;
                case 'one-to-many':
                    ps.push({entity: to, column: `${toCase.snake(from)}_id`, type: 'UnsignedBigInteger'});
                    break;
                default:
                    break;
            }
        }
    }
    await entitiesWriter.writeRecords(es);
    await propertiesWriter.writeRecords(ps);
    await relationsWriter.writeRecords(rs);
}

const getEntitiesAndRelations = async (entitiesFilePath) => {
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
            if(res.entities.indexOf(entityName) === -1) { res.entities.push(entityName); }
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
    getRelationForModel,
    writeEntitiesAndRelationsCSV
    // getRelationDestination
}