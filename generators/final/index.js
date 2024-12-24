import Generator from 'yeoman-generator';
import colors from 'ansi-colors';

export default class FinalGenerator extends Generator {
  static namespace = 'presto:final';

  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
  }

  end() {
    this.log(colors.bold.green(`\nApplication generated successfully with `) + colors.bold.red('♥️') + colors.bold.green(`  & 🚀!\n`));
    this.log(`${colors.green(`Create DB tables with:`)}\n  ${colors.yellowBright(`${this.config.get('packageManager')} run migrate`)}  # or run migrate-cleanup\n`);
    this.log(`${colors.green(`Start your development server with:`)}\n  ${colors.yellowBright(`${this.config.get('packageManager')} run server`)}\n`);
    this.log(`${colors.green(`Start your client with:`)}\n  ${colors.yellowBright(`${this.config.get('packageManager')} run client`)}\n`);
  }
}