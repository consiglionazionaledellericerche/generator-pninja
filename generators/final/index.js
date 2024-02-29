const Generator = require('yeoman-generator');
const colors = require('ansi-colors');

module.exports = class extends Generator {
  end() {
    this.log(colors.bold.green(`\nApplication generated successfully with `) + colors.bold.red('♥️') + colors.bold.green(`  & 🚀!\n`));
    this.log(`${colors.green(`Start your Webpack development server with:`)}\n  ${colors.yellowBright(`${this.config.get('packageManager')} run server`)}\n`);
  }
};