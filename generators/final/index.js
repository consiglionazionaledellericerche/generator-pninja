import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import to from 'to-case';
import pluralize from 'pluralize';
import { getEntities, getEntitiesRelationships } from '../utils/entities-utils.js';
import { AcRule } from '../utils/AcRule.js';

export default class FinalGenerator extends Generator {
  static namespace = 'pninja:final';

  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
  }

  end() {
    const entities = [AcRule, ...getEntities(this)];
    const relationships = getEntitiesRelationships(this);
    this.fs.copyTpl(this.templatePath(`README.md.ejs`), this.destinationPath(`README.md`), { appName: this.config.get('name'), entities, relationships, searchEngine: this.config.get('searchEngine') });
    this.fs.copyTpl(this.templatePath(`../../client/templates/react/src/pages/support/Guide.tsx.ejs`), this.destinationPath(`client/src/pages/support/Guide.tsx`));
    this.fs.copyTpl(this.templatePath(`../../client/templates/react/src/pages/support/guide.md.ejs`), this.destinationPath(`client/src/pages/support/guide.md`), { to, pluralize, entities, searchEngine: this.config.get('searchEngine') });
    this.log(colors.bold.green(`\nApplication generated successfully with `) + colors.bold.red('♥️') + colors.bold.green(`  & `) + colors.bold.blueBright(`PNinja`) + '!\n');
    this.log(`${colors.green(`Set database in server/.env and create tables with:`)}\n  ${colors.yellowBright(`npm run migrate`)}  # or npm run migrate:fresh or npm run migrate:fresh:seed\n`);
    this.log(`${colors.green(`Start your development server with:`)}\n  ${colors.yellowBright(`npm run server`)}\n`);
    this.log(`${colors.green(`Start your development client with:`)}\n  ${colors.yellowBright(`npm run client`)}\n`);
    this.log(`${colors.bold.greenBright(`Check out the `)}${colors.bold.blueBright(`README.md`)}${colors.bold.greenBright(` file for more details`)}\n\n`);
  }
}