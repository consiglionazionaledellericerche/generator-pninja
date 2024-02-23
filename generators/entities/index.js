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
    const entities = this.fs.readJSON(entitiesFilePath) || {};
    // Parsing entities from entities definition file
    if(Array.isArray(entities.entities)) {
      for (let index = 0; index < entities.entities.length; index++) {
        const entity = entities.entities[index];
        const entityProperties = [];
        const ups = [];
        const downs = [];
        for(const col in entity.schema) {
          ups.push(utils.getAddColumnUp(col, entity.schema[col]));
          downs.push(utils.getAddColumnDown(col));
          entityProperties.push(col);
        }
        // Create entity table migration file
        this.spawnCommandSync('php', ['artisan', 'make:migration', `create_${utils.getTableNameFromEntityName(entity.name)}_table`], {cwd: 'server'});
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_columns_to_${utils.getTableNameFromEntityName(entity.name)}_table.php`;
        // Create migration file for columns in entity table
        this.fs.copyTpl(this.templatePath("make_migrations_update_table.php.ejs"), this.destinationPath(migrationFilePath),
        {
          tabName: utils.getTableNameFromEntityName(entity.name),
          up: ups.join("\n"),
          down: downs.join("\n"),
        });

        // Create entity model
        this.fs.copyTpl(this.templatePath("entity_model.php.ejs"), this.destinationPath(`server/app/Models/${utils.getClassNameFromEntityName(entity.name)}.php`),
        {
          className: utils.getClassNameFromEntityName(entity.name),
          fillable: entityProperties.map(p => `'${p}'`).join(', ')
        });

        // Create entity controller
        this.fs.copyTpl(this.templatePath("entity_controller.php.ejs"), this.destinationPath(`server/app/Http/Controllers/${utils.getClassNameFromEntityName(entity.name)}Controller.php`),
        {
          className: utils.getClassNameFromEntityName(entity.name),
          entityName: utils.getVariableNameFromEntityName(entity.name)
        });

        // Create entity routes
        this.fs.copyTpl(this.templatePath("entity_router.php.ejs"), this.destinationPath(`server/routes/${utils.getVariableNameFromEntityName(entity.name)}.php`),
        {
          className: utils.getClassNameFromEntityName(entity.name),
          rootPath: utils.getRootPathFromEntityName(entity.name)
        });
        setTimeout(()=> {
          fs.appendFileSync(this.destinationPath(`server/routes/web.php`), `\nrequire __DIR__ . '/${utils.getVariableNameFromEntityName(entity.name)}.php';`);
        }, 1000)
      }
    }
    // Parsing relations from entities definition file
    if(Array.isArray(entities.relations)) {
      const ups = [];
      const downs = [];
      // Create migration files for relations
      for (let index = 0; index < entities.relations.length; index++) {
        const relation = entities.relations[index];
        ups.push(utils.getAddRelationUp(relation));
        downs.push(utils.getAddRelationDown(relation));
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_relation_${to.snake(relation.type)}_from_${to.snake(relation.from)}_to_${to.snake(relation.to)}.php`;
        this.fs.copyTpl(this.templatePath("make_migrations_update_table.php.ejs"), this.destinationPath(migrationFilePath),
        {
          tabName: utils.getRelationPropertyOwner(relation),
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
