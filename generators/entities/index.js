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
        type: "confirm",
        name: "migrateFresh",
        message: "Cleanup database?",
        default: false
      }]);
      this.answers = {...this.answers, ...answers};
    }
  }
  
  writing() {
    this.log(colors.dim(JSON.stringify(this.answers)));
    if(!this.answers.build && !this.answers.rebuild) { return; }
    const entitiesFilePath = this.answers.entitiesFilePath[0] === '/' ? this.answers.entitiesFilePath : this.destinationPath(this.answers.entitiesFilePath);
    if(!this.fs.exists(entitiesFilePath)) {
      this.log(colors.red(`! Entities configuration file (${entitiesFilePath}) does not exists; no entities will be generated`));
      return
    } else {
      this.log(colors.green(`Entities configuration file found! Generating entities from ${entitiesFilePath}`));
    }
    const entities = this.fs.readJSON(entitiesFilePath) || {};
    if(Array.isArray(entities.entities)) {
      for (let index = 0; index < entities.entities.length; index++) {
        const entity = entities.entities[index];
        const ups = [];
        const downs = [];
        for(const col in entity.schema) {
          ups.push(utils.getAddColumnUp(col, entity.schema[col]));
          downs.push(utils.getAddColumnDown(col));
        }
        this.spawnCommandSync('php', ['artisan', 'make:migration', `create_${utils.getTableNameFromEntityName(entity.name)}_table`], {cwd: 'server'});
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_columns_to_${utils.getTableNameFromEntityName(entity.name)}_table.php`;
        this.fs.copyTpl(this.templatePath("make_migrations_update_table.php.ejs"), this.destinationPath(migrationFilePath),
        {
          tabName: utils.getTableNameFromEntityName(entity.name),
          up: ups.join("\n"),
          down: downs.join("\n"),
        });
      }
    }
    if(Array.isArray(entities.relations)) {
      const ups = [];
      const downs = [];
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
    // if(!this.fs.exists(entitiesFilePath)) {
    //   this.log(colors.red(`! Entities configuration file (${entitiesFilePath}) does not exists; no entities will be generated`))
    // } else {
    //   this.log(colors.green(`Entities configuration file found! Generating entities from ${entitiesFilePath}`));
    // }
    // const entities = this.fs.readJSON(entitiesFilePath) || [];
    // const entitiesPascalNames = entities.map(e => to.pascal(e.name));
    // entities.forEach(e => {
    //   let mongooseSchema = Object.assign({}, e.schema);
    //   Object.keys(mongooseSchema).map(function(key) {
    //     mongooseSchema[key] = mongooseSchema[key] === "Datetime" ? "Date" : mongooseSchema[key];
    //   });
    //   const pascalName = to.pascal(e.name);
    //   const columns = (Object.entries(e.schema)).map(e => ({
    //     title: to.title(e[0]),
    //     field: e[0],
    //     type: e[1].toLowerCase().replace(/^number$/, "numeric")
    //   }));
    //   this.fs.copyTpl(
    //       this.templatePath("server/entities/entity.model.js.ejs"),
    //       this.destinationPath(`server/entities/${pascalName}/${pascalName}.model.js`),
    //       {
    //         entitySchemaName: pascalName,
    //         entitySchema: JSON.stringify(mongooseSchema, null, 4)
    //       }
    //   );
    //   this.fs.copyTpl(
    //       this.templatePath("server/entities/entity.routes.js.ejs"),
    //       this.destinationPath(`server/entities/${pascalName}/${pascalName}.routes.js`),
    //       {
    //         entitySchemaName: pascalName
    //       }
    //   );
    //   this.fs.copyTpl(
    //       this.templatePath("client/src/Entities/Items.js.ejs"),
    //       this.destinationPath(`client/src/Entities/${pascalName}.js`),
    //       {
    //         componentName: pascalName,
    //         componentTitle: to.title(pascalName),
    //         componentApiPath: to.slug(pascalName),
    //         componentColumns: columns
    //       }
    //   );
    // });
    // this.fs.copyTpl(this.templatePath("server/entities/entities.js.ejs"), this.destinationPath("server/entities/entities.js"), { to: to, entities: entitiesPascalNames});
    // this.fs.copyTpl(this.templatePath("client/src/EntitiesRoutes.js.ejs"), this.destinationPath("client/src/EntitiesRoutes.js"), {
    //   entities: entities.map(e => ({
    //     path: to.slug(e.name),
    //     componentName: to.pascal(e.name)
    //   }))
    // });
    // this.fs.copyTpl(this.templatePath("client/src/EntitiesNavigation.js.ejs"), this.destinationPath("client/src/EntitiesNavigation.js"), {
    //   entities: entities.map(e => ({
    //     path: to.slug(e.name),
    //     name: to.title(e.name)
    //   }))
    // });
  }
  end() {
    if(this.answers.build || this.answers.rebuild) {
      if(this.answers.migrateFresh) {
        this.spawnCommandSync('php', ['artisan', 'migrate:fresh'], {cwd: 'server'});
      } else {
        this.spawnCommandSync('php', ['artisan', 'migrate'], {cwd: 'server'});
      }
    }
  }
};
