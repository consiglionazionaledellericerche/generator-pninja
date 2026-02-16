// gerators/entities/index.js
import { fileURLToPath } from 'url';
import path from 'path';
import to from 'to-case';
import pluralize from 'pluralize';
import { getModelRelatedEntities } from '../client/utils/getModelRelatedEntities.js';
import { getModelForeignIds } from '../client/utils/getModelForeignIds.js';
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
import { getEntitiesConfig, getEnumsConfig, splitEntitiesFile } from './utils/entity-splitter.js';
import { getEntities, getEntitiesRelationships, getEnums } from '../utils/entities-utils.js';
import { createEntityPages } from '../client/react.inc.js';
import { AcRule } from '../utils/AcRule.js';
import { validateJDL } from './utils/validateJDL.js';

function sortJdlStructure(jdl) {
  // Create a deep copy to avoid modifying the original
  const sorted = JSON.parse(JSON.stringify(jdl));

  // Sort entities by name
  sorted.entities.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Sort relationships by from.name, then to.name, then cardinality
  sorted.relationships.sort((a, b) => {
    // First compare from.name
    const fromCompare = a.from.name.localeCompare(b.from.name, undefined, { sensitivity: 'base' });
    if (fromCompare !== 0) return fromCompare;

    // If from.name is equal, compare to.name
    const toCompare = a.to.name.localeCompare(b.to.name, undefined, { sensitivity: 'base' });
    if (toCompare !== 0) return toCompare;

    // If to.name is also equal, compare cardinality
    return a.cardinality.localeCompare(b.cardinality, undefined, { sensitivity: 'base' });
  });

  return sorted;
}

export default class extends Generator {
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

    const parsedJDL = sortJdlStructure(parseJDL(entitiesFilePath));

    validateJDL(this, parsedJDL);
    splitEntitiesFile(parsedJDL, this.fs, this.destinationPath.bind(this));

    const entities = getEntities(this);
    const relationships = getEntitiesRelationships(this);
    const enums = getEnums(this);
    const nativeLanguage = this.config.get('nativeLanguage') || 'en';
    const languages = [nativeLanguage, ...this.config.get('languages')];

    const entitiesConfig = getEntitiesConfig(parsedJDL);

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    for (const entityConfig of entitiesConfig) {
      await this.composeWith(path.resolve(__dirname, '../entity'), {
        fromEntities: true,
        enums,
        entityConfig: {
          ...entityConfig,
          relationships: []
        },
      });
    }

    for (const entityConfig of entitiesConfig) {
      await this.composeWith(path.resolve(__dirname, '../entity'), {
        fromEntities: true,
        enums,
        entityConfig: entityConfig,
        relationshipsToAdd: entityConfig.relationships
      });
    }

    for (const enm of enums) {
      this.fs.copyTpl(this.templatePath("Enum.php.ejs"), this.destinationPath(`server/app/Enums/${enm.name}.php`), {
        name: enm.name,
        values: enm.values,
      })
    }

    this.fs.copyTpl(this.templatePath("blobs/dummy.pdf"), this.destinationPath(`server/database/factories/dummy.pdf`));
    this.fs.copyTpl(this.templatePath("blobs/dummy.png"), this.destinationPath(`server/database/factories/dummy.png`));
    this.fs.copyTpl(this.templatePath(`../../final/templates/README.md.ejs`), this.destinationPath(`README.md`), { appName: this.config.get('name'), entities, relationships, searchEngine: this.config.get('searchEngine') });

    // Generate client
    const appName = this.config.get('name');
    const entitiesTemplatePath = this.templatePath();
    const clientTemplatePath = entitiesTemplatePath + '/../../client/templates';
    const searchEngine = this.config.get('searchEngine');
    this.sourceRoot(clientTemplatePath);
    if (this.config.get('clientType') === 'react') {
      // Update entity icons
      this.fs.copyTpl(this.templatePath("react/src/shared/entitiesIcons.tsx.ejs"), this.destinationPath(`client/src/shared/entitiesIcons.tsx`), { entities });

      // Update Menu
      this.fs.copyTpl(this.templatePath("react/src/components/Menu.tsx.ejs"), this.destinationPath(`client/src/components/Menu.tsx`), { appName, entities, to, pluralize, withLangSelect: languages.length > 1 });

      for (const lang of languages) {
        this.fs.copyTpl(this.templatePath(`react/public/locales/entities/entities.json.ejs`), this.destinationPath(`client/public/locales/${lang}/entities.json`), {
          entities: [AcRule, ...entities],
          relationships,
          to,
          pluralize,
          getModelForeignIds,
          getModelRelatedEntities
        });
      };
      this.fs.copyTpl(this.templatePath("react/src/App.tsx.ejs"), this.destinationPath(`client/src/App.tsx`), { entities: [...entities, AcRule], to, pluralize });
      for (const enumeration of getEnumsConfig(parsedJDL)) {
        this.fs.copyTpl(this.templatePath("react/src/shared/model/enumerations/enumeration.model.ts.ejs"), this.destinationPath(`client/src/shared/model/enumerations/${to.slug(enumeration.name)}.model.ts`), { enumeration });
      }
      for (const entity of getEntitiesConfig(parsedJDL)) {
        createEntityPages({ that: this, entity, enums, relationships, searchEngine });
      }
    }
  }
  end() { }
};
