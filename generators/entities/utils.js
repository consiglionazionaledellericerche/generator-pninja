const fs = require('fs');

var _ = require('lodash');

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

const getRelationForModel = (relation) => {
    if (!relation.fromProp) return;
    switch (relation.type) {
        case 'many-to-one':
            return `public function ${toCase.snake(relation.fromProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.to)}::class, '${getVariableNameFromEntityName(relation.to)}_id'); }`;
        case 'one-to-many':
            return `public function ${toCase.snake(relation.fromProp)}(): HasMany { return $this->hasMany(${getClassNameFromEntityName(relation.to)}::class); }`;
        case 'one-to-one':
            return `public function ${toCase.snake(relation.fromProp)}(): HasOne { return $this->hasOne(${getClassNameFromEntityName(relation.to)}::class); }`;
        default:
            return `// TODO ${JSON.stringify(relation)}`;
    }
}

const getInverseRelationForModel = (relation) => {
    if (!relation.toProp) return null;
    switch (relation.type) {
        case 'many-to-one':
            return `public function ${toCase.snake(relation.toProp)}(): HasMany { return $this->hasMany(${getClassNameFromEntityName(relation.from)}::class); }`;
        case 'one-to-many':
            return `public function ${toCase.snake(relation.toProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.from)}::class, '${getVariableNameFromEntityName(relation.from)}_id'); }`;
        case 'one-to-one':
            return `public function ${toCase.snake(relation.toProp)}(): BelongsTo { return $this->belongsTo(${getClassNameFromEntityName(relation.from)}::class, '${getVariableNameFromEntityName(relation.from)}_id'); }`;
        default:
            return `// TODO ${JSON.stringify(relation)}`;
    }
}

const createEntityRoutes = async (that) => {
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

const createEntityControllers = async (that) => {
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
    .columns(["name","class","table","variable","path"])
    .rows();
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];
        const withs = await withCSV(that.destinationPath(`.presto-relations.csv`))
            .columns(["type","from","to","fromProp","toProp","fromLabel","toLabel"])
            .filter(relation => relation.from === entity.name)
            .map(relation => toCase.snake(relation.fromProp))
            .rows();
        const inverseWiths = await withCSV(that.destinationPath(`.presto-relations.csv`))
            .columns(["type","from","to","fromProp","toProp","fromLabel","toLabel"])
            .filter(relation => relation.to === entity.name)
            .map(relation => toCase.snake(relation.toProp))
            .rows();
        that.fs.copyTpl(that.templatePath("entity_controller.php.ejs"), that.destinationPath(`server/app/Http/Controllers/${entity.class}Controller.php`),
        {
          className: entity.class,
          entityName: entity.variable,
          withs: (withs.length || inverseWiths.length) ? `['${_.compact([...withs, ...inverseWiths]).join(`','`)}']` : null
        });
    }
}

const createEntityModels = async (that) => {
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
            .columns(["type","from","to","fromProp","toProp","fromLabel","toLabel"])
            .filter(row => row.from === entity.name)
            .rows();
        const inverseRelations = await withCSV(that.destinationPath(`.presto-relations.csv`))
            .columns(["type","from","to","fromProp","toProp","fromLabel","toLabel"])
            .filter(row => row.to === entity.name)
            .rows();
        that.fs.copyTpl(that.templatePath("entity_model.php.ejs"), that.destinationPath(`server/app/Models/${entity.class}.php`),
        {
          className: entity.class,
          fillable: props.map(p => `'${p.column}'`).join(', '),
          relations: [...relations.map(r => getRelationForModel(r)),...inverseRelations.map(r => getInverseRelationForModel(r))].join("\n\t")
        });
    }
}

const createMigrationsForRelations = async (that) => {
    const relations = await withCSV(that.destinationPath(`.presto-relations.csv`))
        .columns(["type","from","to","fromProp","toProp","fromLabel","toLabel"])
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

const createMigrationsForColumns = async (that) => {
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

const createMigrationsForTables = async (that) => {
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
            {id: 'fromProp', title: 'fromProp'},
            {id: 'toProp', title: 'toProp'},
            {id: 'fromLabel', title: 'fromLabel'},
            {id: 'toLabel', title: 'toLabel'},
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
            let {type, from, to, fromProp, toProp, fromLabel, toLabel} = relations[index];
            type = type.toLowerCase();
            const re = /^([a-zA-Z][a-zA-Z0-9_]*)(?:\{([a-zA-Z][a-zA-Z0-9_]*)\})?$/;
            if(!re.test(from) || !re.test(to)) throw new Error('Relations are not valid!');
            let fromMatches = from.match(re);
            let toMatches = to.match(re);
            from = fromMatches[1];
            fromProp = fromMatches[2];
            to = toMatches[1];
            toProp = toMatches[2];
            if(!fromProp && !toProp) {
                fromProp = to;
                toProp = from;
                switch (type) {
                    case 'many-to-one':
                        fromProp = fromProp && getVariableNameFromEntityName(fromProp);
                        toProp = toProp && getTableNameFromEntityName(toProp);
                        break;
                    case 'one-to-many':
                        fromProp = fromProp && getTableNameFromEntityName(fromProp);
                        toProp = toProp && getVariableNameFromEntityName(toProp);
                        break;
                    case 'one-to-one':
                        fromProp = fromProp && getVariableNameFromEntityName(fromProp);
                        toProp = toProp && getVariableNameFromEntityName(toProp);
                        break;
                }
            }
            rs.push({type, from, to, fromProp, toProp, fromLabel, toLabel});
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

module.exports = {
    writeEntitiesAndRelationsCSV,
    createMigrationsForTables,
    createMigrationsForColumns,
    createEntityModels,
    createMigrationsForRelations,
    createEntityControllers,
    createEntityRoutes
}