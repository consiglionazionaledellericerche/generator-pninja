import Generator from 'yeoman-generator';
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
import { DatabaseSeederConverter } from './utils/database-seeder-converter.js';

const dotPrestoDir = './.presto'
export default class EntityGenerator extends Generator {
  static namespace = 'presto:entities';  // Aggiungi questa riga
  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
  }

  async prompting() {
    let prompts = [];
    if (this.options["fromMain"]) {
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
    if (this.answers.build || this.answers.rebuild) {
      const answers = await this.prompt([{
        store: true,
        type: "input",
        name: "entitiesFilePath",
        message: "Entities definition file path",
        default: '.presto.jdl'
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
    if (!this.answers.build && !this.answers.rebuild) {
      // Nothing to do
      return;
    }
    const entitiesFilePath = this.answers.entitiesFilePath[0] === '/' ? this.answers.entitiesFilePath : this.destinationPath(this.answers.entitiesFilePath);
    if (!this.fs.exists(entitiesFilePath)) {
      // Entities definition file not found, nothing to do
      this.log(colors.red(`! Entities configuration file (${entitiesFilePath}) does not exists; no entities will be generated`));
      return;
    } else {
      this.log(colors.green(`Entities configuration file found! Generating migrations, models, controllers and routes from ${entitiesFilePath}`));
    }

    try {
      spinner = ora(`converting ${entitiesFilePath} to entities json files`).start();
      if (!fs.existsSync(this.destinationPath(dotPrestoDir))) fs.mkdirSync(this.destinationPath(dotPrestoDir));
      const converter = new JDLConverter(this.destinationPath(dotPrestoDir));
      const result = await converter.convertToJSON(entitiesFilePath);
      generatedFiles = result.generatedFiles;
      // console.log(result.entities);
      spinner.succeed(`Converted ${entitiesFilePath} to entities json files`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }
    try {
      spinner = ora(`Converting entities json files to migration files`).start();
      const migrationConverter = new MigrationConverter(this.destinationPath('server/database/migrations'));
      for (let i = 0; i < generatedFiles.length; i++) {
        await migrationConverter.convertToMigration(generatedFiles[i]);
      }
      spinner.succeed(`Converted entities json files to migration files`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }
    try {
      spinner = ora(`Converting entities json files to Model files`);
      const modelConverter = new ModelConverter(this.destinationPath('server/app/Models'));
      for (let i = 0; i < generatedFiles.length; i++) {
        await modelConverter.convertToModel(generatedFiles[i]);
      }
      spinner.succeed(`Converted entities json files to Model files`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }
    try {
      spinner = ora(`Converting entities json files to Controller files`);
      const controllerConverter = new ControllerConverter(this.destinationPath('server/app/Http/Controllers'));
      for (let i = 0; i < generatedFiles.length; i++) {
        await controllerConverter.convertToController(generatedFiles[i]);
      }
      spinner.succeed(`Converted entities json files to Controller files`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }
    try {
      spinner = ora(`Converting entities json files to routes files`);
      const routeConverter = new RouteConverter(this.destinationPath('server/routes'));
      for (let i = 0; i < generatedFiles.length; i++) {
        await routeConverter.convertToRoutes(generatedFiles[i]);
      }
      await routeConverter.generateApiFile();
      spinner.succeed(`Converted entities json files to routes files`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }
    try {
      spinner = ora(`Converting entities json files to seeders`);
      const seederConverter = new SeederConverter('server/database/seeders');
      const dbSeederConverter = new DatabaseSeederConverter('server/database/seeders');
      seederConverter.setRecordsPerEntity(10);
      for (let i = 0; i < generatedFiles.length; i++) {
        await seederConverter.convertToSeeder(generatedFiles[i]);
        await dbSeederConverter.addEntity(generatedFiles[i])
      }
      await dbSeederConverter.generateDatabaseSeeder();
      spinner.succeed(`Converted entities json files to seeders`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }
  }
  end() { }
};
