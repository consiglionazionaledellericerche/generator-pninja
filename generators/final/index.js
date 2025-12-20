import Generator from 'yeoman-generator';
import colors from 'ansi-colors';

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
    const { entities, relationships } = this.fs.readJSON(this.destinationPath(`.pninja/Entities.json`));
    this.fs.copyTpl(this.templatePath(`README.md.ejs`), this.destinationPath(`README.md`), { appName: this.config.get('name'), entities, relationships, searchEngine: this.config.get('searchEngine') });
    this.log(colors.bold.green(`\nApplication generated successfully with `) + colors.bold.red('♥️') + colors.bold.green(`  & `) + colors.bold.blueBright(`PNinja`) + '!\n');
    this.log(`${colors.green(`Set database in server/.env and create tables with:`)}\n  ${colors.yellowBright(`${this.config.get('packageManager')} run migrate`)}  # or npm run migrate:fresh or npm run migrate:fresh:seed\n`);
    this.log(`${colors.green(`Start your development server with:`)}\n  ${colors.yellowBright(`${this.config.get('packageManager')} run server`)}\n`);
    this.log(`${colors.green(`Start your development client with:`)}\n  ${colors.yellowBright(`${this.config.get('packageManager')} run client`)}\n`);
    this.log(`${colors.bold.greenBright(`Check out the `)}${colors.bold.blueBright(`README.md`)}${colors.bold.greenBright(` file for more details`)}\n\n`);
  }
}