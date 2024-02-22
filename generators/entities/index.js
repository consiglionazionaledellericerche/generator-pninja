var Generator = require('yeoman-generator');
const fs = require('fs');
const to = require('to-case');
const colors = require('ansi-colors');

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
        this.spawnCommandSync('php', ['artisan', 'make:migration', `create_${to.snake(entity.name)}_table`], {cwd: 'server'});
      }
      this.spawnCommandSync('php', ['artisan', 'migrate'], {cwd: 'server'});
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
};
