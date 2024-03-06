const fs = require('fs');

const moment = require('moment');

const { withCSV } = require('with-csv');

const pluralize = require('pluralize')

const toCase = require('to-case');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

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
        return `
        \t\t\t$table->foreign('${toCase.snake(relation.from)}_id')
        \t\t\t      ->references('id')
        \t\t\t      ->on('${getTableNameFromEntityName(relation.from)}')
        \t\t\t      ->onDelete('cascade');
        `
        break;
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
        return relation.to;
        break
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
            return `public function ${getTableNameFromEntityName(relation.to)}() { return $this->hasMany(${getClassNameFromEntityName(relation.to)}::class); }`
            break;
        case 'one-to-one':
            return `public function ${getVariableNameFromEntityName(relation.to)}() { return $this->hasOne(${getClassNameFromEntityName(relation.to)}::class); }`;   //`// TODO ${JSON.stringify(relation)}`;
            break;
        default:
            return `// TODO ${JSON.stringify(relation)}`;
            break;
    }
}

const createEntityRoutesFromCSV = async (that) => {
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
    .columns(["name","class","table","variable","path"])
    .rows();
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];        
        that.fs.copyTpl(that.templatePath("entity_router.php.ejs"), that.destinationPath(`server/routes/${entity.path}.php`),
        {
          className: entity.class,
          rootPath: entity.path
        });
        fs.appendFileSync(that.destinationPath(`server/routes/web.php`), `\nrequire __DIR__ . '/${entity.path}.php';`), { encoding: 'utf8', flag: 'w' };
    }
}

const createEntityControllersFromCSV = async (that) => {
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
    .columns(["name","class","table","variable","path"])
    .rows();
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];
        that.fs.copyTpl(that.templatePath("entity_controller.php.ejs"), that.destinationPath(`server/app/Http/Controllers/${entity.class}Controller.php`),
        {
          className: entity.class,
          entityName: entity.variable
        });
    }
}

const createEntityModelsFromCSV = async (that) => {
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
    .columns(["name","class","table","variable","path"])
    .rows();
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];
        const props = await withCSV(that.destinationPath(`.presto-properties.csv`))
            .columns(["entity","column","type"])
            .filter(row => row.entity === entity.name)
            .rows();
        const relations = await withCSV(that.destinationPath(`.presto-relations.csv`))
            .columns(["type","from","to"])
            .filter(row => row.from === entity.name)
            .rows();
        that.fs.copyTpl(that.templatePath("entity_model.php.ejs"), that.destinationPath(`server/app/Models/${entity.class}.php`),
        {
          className: entity.class,
          fillable: props.map(p => `'${p.column}'`).join(', '),
          relations: relations.map(r => getRelationForModel(r)).join("\n\t")
        });
    }
}

const createMigrationsForRelationsFromCSV = async (that) => {
    const relations = await withCSV(that.destinationPath(`.presto-relations.csv`))
        .columns(["type","from","to"])
        .rows();
    for (let index = 0; index < relations.length; index++) {
        const relation = relations[index];
        const tabName = getTableNameFromEntityName(getRelationPropertyOwner(relation));
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_relation_${toCase.snake(relation.type)}_from_${toCase.snake(relation.from)}_to_${toCase.snake(relation.to)}.php`;
        that.fs.copyTpl(that.templatePath("make_migrations_update_table.php.ejs"), that.destinationPath(migrationFilePath),
        {
          tabName,
          up: getAddRelationUp(relation),
          down: getAddRelationDown(relation),
        });
    }
}

const createMigrationsForColumnsFromCSV = async (that) => {
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
        .columns(["name","class","table","variable","path"])
        .rows();
    for (let index = 0; index < entities.length; index++) {
        const ups = [];
        const downs = [];
        const entity = entities[index];
        const props = await withCSV(that.destinationPath(`.presto-properties.csv`))
            .columns(["entity","column","type"])
            .filter(row => row.entity === entity.name)
            .rows();
        for (let index = 0; index < props.length; index++) {
            const property = props[index];
            ups.push(getAddColumnUp(property.column, property.type));
            downs.push(getAddColumnDown(property.column));
        }
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_columns_to_${entity.table}_table.php`;
        that.fs.copyTpl(that.templatePath("make_migrations_update_table.php.ejs"), that.destinationPath(migrationFilePath),
        {
          tabName: entity.table,
          up: ups.join("\n"),
          down: downs.join("\n"),
        });
    }
}

const createMigrationsForTablesFromCSV = async (that) => {
    const tables = await withCSV(that.destinationPath(`.presto-entities.csv`))
        .columns(["name","class","table","variable","path"])
        .map(row => row.table)
        .rows();
    for (let index = 0; index < tables.length; index++) {
        const table = tables[index];
        that.spawnCommandSync('php', ['artisan', 'make:migration', `create_${table}_table`], {cwd: 'server'});
    }
}

const writeEntitiesAndRelationsCSV = async (entitiesFilePath, that) => {
    const entitiesWriter = createCsvWriter({
        path: that.destinationPath('.presto-entities.csv'),
        header: [
            {id: 'name', title: 'name'},
            {id: 'class', title: 'class'},
            {id: 'table', title: 'table'},
            {id: 'variable', title: 'variable'},
            {id: 'path', title: 'path'}
        ]
    });
    const propertiesWriter = createCsvWriter({
        path: that.destinationPath('.presto-properties.csv'),
        header: [
            {id: 'entity', title: 'entity'},
            {id: 'column', title: 'column'},
            {id: 'type', title: 'type'},
        ]
    });
    const relationsWriter = createCsvWriter({
        path: that.destinationPath('.presto-relations.csv'),
        header: [
            {id: 'type', title: 'type'},
            {id: 'from', title: 'from'},
            {id: 'to', title: 'to'},
        ]
    });
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
                    ps.push({entity: to, column: `${toCase.snake(from)}_id`, type: 'UnsignedBigInteger'});
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
    writeEntitiesAndRelationsCSV,
    createMigrationsForTablesFromCSV,
    createMigrationsForColumnsFromCSV,
    createEntityModelsFromCSV,
    createMigrationsForRelationsFromCSV,
    createEntityControllersFromCSV,
    createEntityRoutesFromCSV
}