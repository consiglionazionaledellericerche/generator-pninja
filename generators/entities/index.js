'use strict';
var Generator = require('yeoman-generator');
const fs = require('fs');
const to = require('to-case');
const colors = require('ansi-colors');
const utils = require('./utils');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
  }
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

  configuring() {
    for(const key in this.answers){
      this.config.set(key, this.answers[key]);
    }
    this.config.save();
  }
  
  async writing() {
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
      this.log(colors.green(`Entities configuration file found! Generating tables, models, controllers and routes from ${entitiesFilePath}`));
    }
    await utils.writeEntitiesAndRelationsCSV(entitiesFilePath, this);
    await utils.createMigrationsForTables(this);
    await utils.createMigrationsForColumns(this);
    await utils.createMigrationsForRelations(this);
    await utils.createEntityModels(this);
    await utils.createEntityControllers(this);
    await utils.createEntityRoutes(this);
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
