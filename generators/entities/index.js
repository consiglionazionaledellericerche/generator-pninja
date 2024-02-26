var Generator = require('yeoman-generator');
const fs = require('fs');
const to = require('to-case');
const colors = require('ansi-colors');
const moment = require('moment');
const utils = require('./utils');

module.exports = class extends Generator {
  async prompting() {
    let prompts = [];
    if(this.options["fromMain"]) {
      prompts = [...prompts, ...[{
        store: true,
        type: "confirm",
        name: "build",
        message: "Build all entities from entities definition file?",
        default: true
      }]]
    } else {
      prompts = [...prompts, ...[{
        type: "confirm",
        name: "rebuild",
        message: "Rebuild all entities?",
        default: false
      }]]
    }
    this.answers = await this.prompt(prompts);
    if(this.answers.build || this.answers.rebuild) {
      const answers = await this.prompt([{
        store: true,
        type: "input",
        name: "entitiesFilePath",
        message: "Entities definition file path",
        default: '.vamp.entities.json'
      },{
        store: true,
        type: "confirm",
        name: "migrateFresh",
        message: "Cleanup database?",
        default: false
      }]);
      this.answers = {...this.answers, ...answers};
    }
  }
  
  writing() {
    if(!this.answers.build && !this.answers.rebuild) {
      // Nothing to do
      return;
    }
    const entitiesFilePath = this.answers.entitiesFilePath[0] === '/' ? this.answers.entitiesFilePath : this.destinationPath(this.answers.entitiesFilePath);
    if(!this.fs.exists(entitiesFilePath)) {
      // Entities definition file not found, nothing to do
      this.log(colors.red(`! Entities configuration file (${entitiesFilePath}) does not exists; no entities will be generated`));
      return;
    } else {
      this.log(colors.green(`Entities configuration file found! Generating entities from ${entitiesFilePath}`));
    }
    // Reading entities definition file
    // const entities = this.fs.readJSON(entitiesFilePath) || {};
    // Parsing entities from entities definition file
    console.log(`\n\n\n\n\n\n\n\n\n\n\n%o\n\n\n\n\n\n\n\n\n\n\n`, utils.getEntitiesAndRelations(entitiesFilePath));
    const {entities, properties, relations} = utils.getEntitiesAndRelations(entitiesFilePath);
    for (let index = 0; index < entities.length; index++) {
      const entity = entities[index];
      this.spawnCommandSync('php', ['artisan', 'make:migration', `create_${utils.getTableNameFromEntityName(entity)}_table`], {cwd: 'server'});
    }
    
    for(entityName in properties) {
      const props = properties[entityName];
      const tabName = utils.getTableNameFromEntityName(entityName);
      const ups = [];
      const downs = [];
      for (let index = 0; index < props.length; index++) {
        const property = props[index];
        ups.push(utils.getAddColumnUp(property.name, property.type));
        downs.push(utils.getAddColumnDown(property.name));
      }
      const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_columns_to_${tabName}_table.php`;
      // Create migration file for columns in entity table
      this.fs.copyTpl(this.templatePath("make_migrations_update_table.php.ejs"), this.destinationPath(migrationFilePath),
      {
        tabName,
        up: ups.join("\n"),
        down: downs.join("\n"),
      });
      // Create entity model
      this.fs.copyTpl(this.templatePath("entity_model.php.ejs"), this.destinationPath(`server/app/Models/${utils.getClassNameFromEntityName(entityName)}.php`),
      {
        className: utils.getClassNameFromEntityName(entityName),
        fillable: properties[entityName].map(p => `'${p.name}'`).join(', ')
      });
      
      // Create entity controller
      this.fs.copyTpl(this.templatePath("entity_controller.php.ejs"), this.destinationPath(`server/app/Http/Controllers/${utils.getClassNameFromEntityName(entityName)}Controller.php`),
      {
        className: utils.getClassNameFromEntityName(entityName),
        entityName: utils.getVariableNameFromEntityName(entityName)
      });
      
      // Create entity routes
      this.fs.copyTpl(this.templatePath("entity_router.php.ejs"), this.destinationPath(`server/routes/${utils.getVariableNameFromEntityName(entityName)}.php`),
      {
        className: utils.getClassNameFromEntityName(entityName),
        rootPath: utils.getRootPathFromEntityName(entityName)
      });
      fs.appendFileSync(this.destinationPath(`server/routes/web.php`), `\nrequire __DIR__ . '/${utils.getVariableNameFromEntityName(entityName)}.php';`), { encoding: 'utf8', flag: 'w' };
      // setTimeout(()=> {
      //   fs.appendFileSync(this.destinationPath(`server/routes/web.php`), `\nrequire __DIR__ . '/${utils.getVariableNameFromEntityName(entityName)}.php';`), { encoding: 'utf8', flag: 'w' };
      // }, 1000)
    }


    for(entityName in relations) {
      const rels = relations[entityName];
      const tabName = utils.getTableNameFromEntityName(entityName);
      const ups = [];
      const downs = [];
      // Create migration files for relations
      for (let index = 0; index < rels.length; index++) {
        const relation = rels[index];
        ups.push(utils.getAddRelationUp(relation));
        downs.push(utils.getAddRelationDown(relation));
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_relation_${to.snake(relation.type)}_from_${to.snake(relation.from)}_to_${to.snake(relation.to)}.php`;
        this.fs.copyTpl(this.templatePath("make_migrations_update_table.php.ejs"), this.destinationPath(migrationFilePath),
        {
          tabName: utils.getTableNameFromEntityName(utils.getRelationPropertyOwner(relation)),
          up: ups.join("\n"),
          down: downs.join("\n"),
        });
      }
    }
  }
  end() {
    if(this.answers.build || this.answers.rebuild) {
      // Execute migrations
      if(this.answers.migrateFresh) {
        this.spawnCommandSync('php', ['artisan', 'migrate:fresh'], {cwd: 'server'});
      } else {
        this.spawnCommandSync('php', ['artisan', 'migrate'], {cwd: 'server'});
      }
    }
  }
};
