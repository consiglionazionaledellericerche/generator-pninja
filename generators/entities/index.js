import Generator from 'yeoman-generator';
import { hello } from '../utils/hello.js';
import ora from 'ora';
import colors from 'ansi-colors';
import { parseJDL } from '../utils/jdlParser.js';
import { MigrationsGenerator } from './utils/migrations-generator.js';
import { ModelsGenerator } from './utils/models-generator.js';
import { ControllersGenerator } from './utils/controllers-generator.js';
import { RoutersGenerator } from './utils/routers-generator.js';
import { FactoriesGenerator } from './utils/factories-generator.js';
import { splitEntitiesFile } from './utils/entity-splitter.js';
export default class EntityGenerator extends Generator {
  static namespace = 'pninja:entities';
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
      }, {
        store: true,
        type: "input",
        name: "entitiesFilePath",
        message: "Entities definition file path",
        default: this.config.get('entitiesFilePath') || 'entities.jdl',
        when: answers => answers.build,
        validate: (input) => {
          const filePath = input[0] === '/' ? input : this.destinationPath(input);
          if (!this.fs.exists(filePath)) {
            return `File '${input}' does not exist. Please provide a valid file path.`;
          }
          return true;
        }
      }, {
        store: true,
        type: "number",
        name: "howManyToGenerate",
        message: "How many entities to generate for each entity (factories)?",
        default: this.config.get('howManyToGenerate') ?? 10,
        when: answers => answers.build
      }]]
    }
    this.answers = await this.prompt(prompts);
  }

  configuring() {
    for (const key in this.answers) {
      this.config.set(key, this.answers[key]);
    }
    this.config.save();
  }

  async writing() {
    let spinner = undefined;
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

    const parsedJDL = parseJDL(entitiesFilePath);

    parsedJDL.relationships.forEach(relation => {
      if (relation.from.name === relation.to.name && (relation.from.required || relation.to.required)) {
        throw new Error(`${colors.redBright('ERROR!')} Required relationships to the same entity are not supported, for relationship from and to '${relation.from.name}'.`)
      }
    });

    this.fs.writeJSON(this.destinationPath('.pninja/Entities.json'), parsedJDL);
    splitEntitiesFile(parsedJDL, this.fs, this.destinationPath.bind(this));

    // JDL > Migrations
    try {
      spinner = ora(`Generating migration files`).start();
      (new MigrationsGenerator(this)).generateMigrations();
      spinner.succeed(`Migration files generated`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }

    // Generating models
    try {
      spinner = ora(`Generating Model files`);
      (new ModelsGenerator(this)).generateModels();
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

    // Generating Factories and DatabaseSeeder
    try {
      spinner = ora(`Generating Factory files`);
      (new FactoriesGenerator(this, entitiesFilePath)).generateFactories(this.config.get('howManyToGenerate') || 0);
      spinner.succeed(`Factory files generated`);
    } catch (error) {
      spinner.fail();
      console.error(error);
      throw error;
    }

    this.fs.copyTpl(this.templatePath("blobs/dummy.pdf"), this.destinationPath(`server/database/factories/dummy.pdf`));
    this.fs.copyTpl(this.templatePath("blobs/dummy.png"), this.destinationPath(`server/database/factories/dummy.png`));
    this.fs.copyTpl(this.templatePath("database/seeders/csv/AcRule.csv.ejs"), this.destinationPath(`server/database/seeders/csv/AcRule.csv`), { entities: parsedJDL.entities });
    this.fs.copyTpl(this.templatePath(".gitkeep.ejs"), this.destinationPath(`server/storage/app/private/uploads/.gitkeep`));
    this.fs.copyTpl(this.templatePath(".gitkeep.ejs"), this.destinationPath(`server/storage/app/public/uploads/.gitkeep`));
    this.fs.copyTpl(this.templatePath("app/Http/Middleware/AccessControl.php.ejs"), this.destinationPath(`server/app/Http/Middleware/AccessControl.php`));
    this.fs.copyTpl(this.templatePath("app/Http/Middleware/SessionAuth.php.ejs"), this.destinationPath(`server/app/Http/Middleware/SessionAuth.php`));
    this.fs.copyTpl(this.templatePath("app.php.ejs"), this.destinationPath(`server/bootstrap/app.php`));
    this.fs.copyTpl(this.templatePath("filesystems.php.ejs"), this.destinationPath(`server/config/filesystems.php`));
    this.fs.copyTpl(this.templatePath("config/audit.php.ejs"), this.destinationPath('server/config/audit.php'), {
      authenticationProvider: this.config.get('authentication')
    });
    this.fs.copyTpl(this.templatePath("config/lauthz-rbac-model.conf"), this.destinationPath('server/config/lauthz-rbac-model.conf'));
    this.fs.copyTpl(this.templatePath("config/lauthz.php"), this.destinationPath('server/config/lauthz.php'));
  }
  end() { }
};
