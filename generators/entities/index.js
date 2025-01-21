import Generator from 'yeoman-generator';
import jclrz from 'json-colorz';
import { hello } from '../utils/hello.js';
import ora from 'ora';
import fs from 'fs';
import to from 'to-case';
import colors from 'ansi-colors';
import { JDLConverter } from './utils/jdl-converter.js';
import { MigrationConverter } from './utils/migration-converter.js';
import { ModelConverter } from './utils/model-converter.js';
import { ControllerConverter } from './utils/controller-converter.js';
import { RouteConverter } from './utils/route-converter.js';
import { SeederConverter } from './utils/seeder-converter.js';
import { FactoryConverter } from './utils/factory-converter.js';
import { FileDeleter } from './utils/fileDeleter.js';
import jhipsterCore from 'jhipster-core';
const { parseFromFiles } = jhipsterCore;
import { MigrationsGenerator } from './utils/migrations-generator.js';
import { ModelsGenerator } from './utils/models-generator.js';
import { ControllersGenerator } from './utils/controllers-generator.js';
import { RoutersGenerator } from './utils/routers-generator.js';
import { FactoriesGenerator } from './utils/factories-generator.js';
// import { convertFields, createMigrations } from './utils/migration-utils.js';

const dotPrestoDir = './.presto'
export default class EntityGenerator extends Generator {
  static namespace = 'presto:entities';  // Aggiungi questa riga
  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
    if (!this.options.fromMain) hello(this.log);
    this.argument('entitiesFilePath', {
      type: String,
      required: !this.options.fromMain,
      description: 'Entities file path'
    });
  }

  async prompting() {
    let prompts = [];
    if (this.options.fromMain) {
      prompts = [...prompts, ...[{
        store: true,
        type: "confirm",
        name: "build",
        message: "Build all entities from entities definition file?",
        default: true
      }]]
    } else {
      // prompts = [...prompts, ...[{
      //   type: "confirm",
      //   name: "rebuild",
      //   message: "Rebuild all entities?",
      //   default: true
      // }]]
    }
    this.answers = await this.prompt(prompts);
    if (this.answers.build && this.options.fromMain) {
      const answers = await this.prompt([{
        store: true,
        type: "input",
        name: "entitiesFilePath",
        message: "Entities definition file path",
        default: this.config.get('entitiesFilePath') || '.presto.jdl'
      }]);
      this.answers = { ...this.answers, ...answers };
    }
  }

  configuring() {
    for (const key in this.answers) {
      this.config.set(key, this.answers[key]);
    }
    this.config.save();
  }

  async writing() {
    let spinner = undefined;
    let generatedFiles = undefined;
    if (this.options.fromMain && !this.answers.build) {
      // Nothing to do
      return;
    }
    let entitiesFilePath = this.options.fromMain ? this.answers.entitiesFilePath : this.options.entitiesFilePath;
    entitiesFilePath = entitiesFilePath[0] === '/' ? entitiesFilePath : this.destinationPath(entitiesFilePath);
    if (!this.fs.exists(entitiesFilePath)) {
      // Entities definition file not found, nothing to do
      this.log(colors.red(`! Entities configuration file (${entitiesFilePath}) does not exists; no entities will be generated`));
      return;
    } else {
      this.log(colors.green(`Entities configuration file found! Generating migrations, models, controllers and routes from ${entitiesFilePath}`));
    }

    const parsedJDL = parseFromFiles([entitiesFilePath]);

    this.fs.writeJSON(this.destinationPath(`.presto/Entities.json`), parsedJDL);

    // console.log(`\n\n====== PARSED JDL ======`);
    // jclrz(parsedJDL)
    // console.log(`========================\n\n`);

    // JDL > Migrations
    try {
      spinner = ora(`Generating migration files`).start();
      (new MigrationsGenerator(this, entitiesFilePath)).generateMigrations();
      spinner.succeed(`Migration files generated`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }

    // Generating models
    try {
      spinner = ora(`Generating Model files`);
      (new ModelsGenerator(this, entitiesFilePath)).generateModels();
      spinner.succeed(`Model files generated`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }

    // Generating Controllers
    try {
      spinner = ora(`Generating Controller files`);
      (new ControllersGenerator(this, entitiesFilePath)).generateControllers();
      spinner.succeed(`Controller files generated`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }

    // Generating Routers
    try {
      spinner = ora(`Generating Router files`);
      (new RoutersGenerator(this, entitiesFilePath)).generateRouters();
      spinner.succeed(`Router files generated`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }

    // Generating Factories
    try {
      spinner = ora(`Generating Factory files`);
      (new FactoriesGenerator(this, entitiesFilePath)).generateFactories(10);
      spinner.succeed(`Factory files generated`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }
  }
  end() { }
};
