import Generator from 'yeoman-generator';
import ora from 'ora';
import fs from 'fs';
import to from 'to-case';
import colors from 'ansi-colors';
import { JDLConverter } from './jdl-converter.js';
import { MigrationConverter } from './migration-converter.js';
import { ModelConverter } from './utils/model-converter.js';

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
    let convSpinner = undefined;
    let convMigSpinner = undefined;
    let convModSpinner = undefined;
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
      this.log(colors.green(`Entities configuration file found! Generating tables, models, controllers and routes from ${entitiesFilePath}`));
    }

    convSpinner = ora(`converting ${entitiesFilePath} to entities json files`).start();
    if (!fs.existsSync(this.destinationPath(dotPrestoDir))) fs.mkdirSync(this.destinationPath(dotPrestoDir));
    const converter = new JDLConverter(this.destinationPath(dotPrestoDir));
    const result = await converter.convertToJSON(entitiesFilePath);
    convSpinner.succeed(`Converted ${entitiesFilePath} to entities json files`);
    convMigSpinner = ora(`Converting entities json files to migration files`).start();
    const migrationConverter = new MigrationConverter(this.destinationPath('server/database/migrations'));
    for (let i = 0; i < result.generatedFiles.length; i++) {
      await migrationConverter.convertToMigration(result.generatedFiles[i]);
    }
    convMigSpinner.succeed(`Converted entities json files to migration files`);
    convModSpinner = ora(`Converting entities json files to Model files`);
    const modelConverter = new ModelConverter(this.destinationPath('server/app/Models'));
    for (let i = 0; i < result.generatedFiles.length; i++) {
      await modelConverter.convertToModel(result.generatedFiles[i]);
    }
    convModSpinner.succeed(`Converted entities json files to Model files`);

    // await utils.createEntityModels(this);
    // await utils.createEntityControllers(this);
    // await utils.createEntityRoutes(this);
  }
  end() { }
};
