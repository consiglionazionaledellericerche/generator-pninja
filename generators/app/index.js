var Generator = require('yeoman-generator');
const fs = require('fs');
const to = require('to-case');
const colors = require('ansi-colors');
var randomstring = require("randomstring");

module.exports = class extends Generator {
  // note: arguments and options should be defined in the constructor.
  constructor(args, opts) {
    super(args, opts);
    
    // This makes `appname` a required argument.
    // this.argument("appname", { type: String, required: true });
    
    // And you can then access it later; e.g.
    // this.log(this.options.appname);
  }
  async initializing() {
    this.log(colors.red("┓┏            _   ,_,   _     "));
    this.log(colors.red("┃┃┏┓┏┳┓┏┓    / `'=) (='` \\    "));
    this.log(colors.red("┗┛┗┻┛┗┗┣┛   /.-.-.\\ /.-.-.\\   "));
    this.log(colors.red('       ┛    `      "      `   '));
    this.log(`${colors.bold.red(`Vamp`)}: ${colors.whiteBright(`Vue and MySQL/PHP Generator`)}`);
    // this.log(colors.red("                                                            "));
    // this.log(colors.red("   ██╗   ██╗ █████╗ ███╗   ███╗██████╗      _   ,_,   _     "));
    // this.log(colors.red("   ██║   ██║██╔══██╗████╗ ████║██╔══██╗    / `'=) (='` \\    "));
    // this.log(colors.red("   ██║   ██║███████║██╔████╔██║██████╔╝   /.-.-.\\ /.-.-.\\   ")); 
    // this.log(colors.red("   ╚██╗ ██╔╝██╔══██║██║╚██╔╝██║██╔═══╝    `      \"      `   "));
    // this.log(colors.red("    ╚████╔╝ ██║  ██║██║ ╚═╝ ██║██║       Vue and MySQL/PHP  "));
    // this.log(colors.red("     ╚═══╝  ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝       Generator v.0.1.0  "));
    // this.log(colors.red("                                                            "));
    this.log(`\n${colors.whiteBright('Application files will be generated in folder:')} ${colors.yellow(__dirname)}\n\n`);
    this.composeWith(require.resolve("../entities"),{fromMain: true});
  }
  async prompting() {
    this.answers = await this.prompt([
      {
        store: true,
        type: "input",
        name: "name",
        message: "Your project name",
        default: this.options.appname || this.config.get('name') || this.appname // Default to current folder name
      },{
        store: true,
        type: "list",
        name: "dbms",
        message: "Your DBMS",
        default: "sqlite",
        choices: [
          {
            name: "SQLite",
            value: "sqlite"
          },
          {
            name: "MySQL",
            value: "mysql"
          }
        ]
      },{
        store: true,
        type: "list",
        name: "packageManager",
        message: "Your package manager",
        default: "npm",
        choices: [
          {
            name: "Npm",
            value: "npm"
          },
          {
            name: "Yarn",
            value: "yarn"
          }
        ]
      },
    ]);
    if(this.answers.dbms === 'mysql') {
      const answers = await this.prompt([
        {
          store: true,
          type: "input",
          name: "dbmsDB_HOST",
          message: "DB Host",
          default: '127.0.0.1'
        },{
          store: true,
          type: "input",
          name: "dbmsDB_PORT",
          message: "DB Port",
          default: '3306'
        },{
          store: true,
          type: "input",
          name: "dbmsDB_DATABASE",
          message: "Database",
          default: to.snake(this.answers.name)
        },{
          store: true,
          type: "input",
          name: "dbmsDB_USERNAME",
          message: "Database username",
          default: 'user'
        },{
          store: true,
          type: "input",
          name: "dbmsDB_PASSWORD",
          message: "Database password",
          default: 'secret'
        }
      ]);
      this.answers = {...this.answers, ...answers};
    }
  }
  
  writing() {
    this.spawnCommandSync('composer', ['create-project',`laravel/lumen`,'server']);
    let envFileContents = fs.readFileSync(`${this.destinationPath('server')}/.env`, { encoding: 'utf8', flag: 'r' });
    this.log(`${colors.green('   write settings to')} ${colors.whiteBright(`${this.destinationPath('server')}/.env`)}`);
    envFileContents = envFileContents.replace(/^APP_NAME=.*$/m, `APP_NAME=${to.constant(this.answers.name)}`);
    envFileContents = envFileContents.replace(/^APP_KEY=.*$/m, `APP_KEY=${randomstring.generate()}`);
    envFileContents = envFileContents.replace(/^DB_CONNECTION=.*$/m, `DB_CONNECTION=${this.answers.dbms}`);
    envFileContents = envFileContents.replace(/^DB_HOST=.*$/m, `DB_HOST=${this.answers.dbmsDB_HOST}`);
    envFileContents = envFileContents.replace(/^DB_PORT=.*$/m, `DB_PORT=${this.answers.dbmsDB_PORT}`);
    envFileContents = envFileContents.replace(/^DB_DATABASE=.*$/m, `DB_DATABASE=${this.answers.dbmsDB_DATABASE}`);
    envFileContents = envFileContents.replace(/^DB_USERNAME=.*$/m, `DB_USERNAME=${this.answers.dbmsDB_USERNAME}`);
    envFileContents = envFileContents.replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD=${this.answers.dbmsDB_PASSWORD}`);
    fs.writeFileSync(`${this.destinationPath('server')}/.env`, envFileContents, { encoding: 'utf8', flag: 'w' });
    // this.log(envFileContents.replace(/^([^=]+)(=.*)$/gm, colors.cyan('$1') + colors.whiteBright('$2')));
    this.fs.copyTpl(this.templatePath("package.json.ejs"), this.destinationPath("package.json"),
    {
      packageName: to.slug(this.answers.name),
      projectName: to.title(this.answers.name),
      projectDescription: this.projectDescription,
      projectVersion: this.projectVersion,
      authorName: this.authorName
    });
    // this.log(fs.readFileSync(`${this.destinationPath('server')}/.env`), { encoding: 'utf8', flag: 'r' });
    
    // this.log(JSON.stringify(this.config.getAll()));
    // this.spawnCommandSync('mkdir', this.destinationPath('server'));
    // this.spawnCommandSync('cd', this.destinationPath('server'));
    // this.log(JSON.stringify(this.props));
    // this.log("app name", this.answers.name);
    // this.log("app packageManager", this.answers.packageManager);
    // this.log("app installDeps", this.answers.installDeps);
    // this.log(this.destinationRoot());
    // this.log(this.destinationPath('index.js'));
    // this.log(this.sourceRoot());
    // this.log(this.templatePath('index.js'));
  }
  
  end() {
    this.log(colors.bold.green(`\nApplication generated successfully with`) + colors.bold.red(' ♥️ ') + colors.bold.green(`& 🦇!\n`));
    // this.log(`${colors.whiteBright('Running dev server')} ${colors.green(`npm run server`)}`);
    this.log(`${colors.green(`Start your Webpack development server with:`)}\n  ${colors.yellowBright(`${this.answers.packageManager} run server`)}\n`);
    this.log(colors.green(`\nCongratulations, Vamp execution is complete!\n`))
    // this.spawnCommandSync(this.answers.packageManager, ['run', 'server']);
  }
};