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
        \t\t\t$table->bigInteger('${to.snake(relation.to)}_id')->unsigned();
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
        return `
        \t\t\t$table->dropForeign(['${to.snake(relation.to)}_id']);
        \t\t\t$table->dropColumn('${to.snake(relation.to)}_id');
        `
        break;
        
        default:
        return undefined;
        break;
    }
}

const getRelationPropertyOwner = (relation) => {
    switch (relation.type.toLowerCase()) {
        case 'many-to-one':
        return getTableNameFromEntityName(relation.from);
        break;
        
        default:
        return undefined;
        break;
    }
}


module.exports = {
    getClassNameFromEntityName,
    getTableNameFromEntityName,
    getVariableNameFromEntityName,
    getRootPathFromEntityName,
    getAddColumnUp,
    getAddColumnDown,
    getAddRelationUp,
    getAddRelationDown,
    getRelationPropertyOwner
}