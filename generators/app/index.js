import Generator from 'yeoman-generator';
import fs from 'fs';
import to from 'to-case';
import colors from 'ansi-colors';
import Utils from './utils.js';
import randomstring from 'randomstring';
import path from 'path';
import { fileURLToPath } from 'url';

const utils = new Utils();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
  }
  async initializing() {
    utils.hello(this.log);
    this.log(`\n${colors.whiteBright('Application files will be generated in folder:')} ${colors.yellow(process.env.PWD)}\n`);
    // this.composeWith(require.resolve("../auth"), { fromMain: true });
    const entitiesGeneratorPath = path.resolve(__dirname, '../entities/index.js');
    await this.composeWith({
      Generator: (await import(entitiesGeneratorPath)).default,
      path: path.dirname(entitiesGeneratorPath)
    }, {
      fromMain: true,
      env: this.env,
      resolved: entitiesGeneratorPath,
      namespace: 'presto:entities'
    });
    // this.composeWith(require.resolve("../client"), { fromMain: true });
    // this.composeWith(require.resolve("../final"), { fromMain: true });
  }
  async prompting() {
    this.answers = await this.prompt([
      {
        type: "input",
        name: "name",
        message: "Your project name",
        default: this.config.get('name') || this.appname // Default to current folder name
      }, {
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
          },
          {
            name: "MariaDB",
            value: "mariadb"
          },
          {
            name: "PostgreSQL",
            value: "pgsql"
          },
          {
            name: "SQL Server",
            value: "sqlsrv"
          }
        ]
      }, {
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
            name: "Yarn (Not implemented yet)",
            value: "yarn"
          }
        ]
      },
    ]);
  }

  configuring() {
    for (const key in this.answers) {
      this.config.set(key, this.answers[key]);
    }
    this.config.save();
  }

  writing() {
    this.spawnCommandSync('composer', ['create-project', '--prefer-dist', 'laravel/laravel=~11.0.3', 'server']);
    this.spawnCommandSync('composer', ['require', '--dev', 'beyondcode/laravel-dump-server'], { cwd: 'server' });
    this.spawnCommandSync('php', ['artisan', 'install:api', '--without-migration-prompt'], { cwd: 'server' });
    let envFileContents = fs.readFileSync(`${this.destinationPath('server')}/.env`, { encoding: 'utf8', flag: 'r' });
    this.log(`${colors.green('   write settings to')} ${colors.whiteBright(`${this.destinationPath('server')}/.env`)}`);
    envFileContents = envFileContents.replace(/^APP_NAME=.*$/m, `APP_NAME=${to.constant(this.answers.name)}`);
    envFileContents = envFileContents.replace(/^APP_KEY=.*$/m, `APP_KEY=${randomstring.generate()}`);
    if (this.answers.dbms === 'sqlite') {
      envFileContents = envFileContents.replace(/^DB_CONNECTION=.*$/m, `DB_CONNECTION=sqlite`);
      envFileContents = envFileContents.replace(/^(# )?DB_DATABASE=.*$/m, `# DB_DATABASE=/absolute/path/to/database.sqlite\n# DB_PREFIX=`);
      envFileContents = envFileContents.replace(/^(# )?DB_HOST=.*$\n/m, ``);
      envFileContents = envFileContents.replace(/^(# )?DB_PORT=.*$\n/m, ``);
      envFileContents = envFileContents.replace(/^(# )?DB_USERNAME=.*$\n/m, ``);
      envFileContents = envFileContents.replace(/^(# )?DB_PASSWORD=.*$\n/m, ``);
    }
    if (this.answers.dbms === 'mysql') {
      envFileContents = envFileContents.replace(/^DB_CONNECTION=.*$/m, `DB_CONNECTION=mysql`);
      envFileContents = envFileContents.replace(/^(# )?DB_HOST=.*$/m, `DB_HOST=127.0.0.1`);
      envFileContents = envFileContents.replace(/^(# )?DB_PORT=.*$/m, `DB_PORT=3306`);
      envFileContents = envFileContents.replace(/^(# )?DB_DATABASE=.*$/m, `DB_DATABASE=test\n# DB_PREFIX=`);
      envFileContents = envFileContents.replace(/^(# )?DB_USERNAME=.*$/m, `DB_USERNAME=root`);
      envFileContents = envFileContents.replace(/^(# )?DB_PASSWORD=.*$/m, `DB_PASSWORD=mysecretpassword\nDB_CHARSET=utf8mb4\nDB_COLLATION=utf8mb4_unicode_ci`);
    }
    if (this.answers.dbms === 'mariadb') {
      envFileContents = envFileContents.replace(/^DB_CONNECTION=.*$/m, `DB_CONNECTION=mariadb`);
      envFileContents = envFileContents.replace(/^(# )?DB_HOST=.*$/m, `DB_HOST=127.0.0.1`);
      envFileContents = envFileContents.replace(/^(# )?DB_PORT=.*$/m, `DB_PORT=3306`);
      envFileContents = envFileContents.replace(/^(# )?DB_DATABASE=.*$/m, `DB_DATABASE=test\n# DB_PREFIX=`);
      envFileContents = envFileContents.replace(/^(# )?DB_USERNAME=.*$/m, `DB_USERNAME=root`);
      envFileContents = envFileContents.replace(/^(# )?DB_PASSWORD=.*$/m, `DB_PASSWORD=mysecretpassword\nDB_CHARSET=utf8mb4\nDB_COLLATION=utf8mb4_unicode_ci`);
    }
    if (this.answers.dbms === 'pgsql') {
      envFileContents = envFileContents.replace(/^DB_CONNECTION=.*$/m, `DB_CONNECTION=pgsql`);
      envFileContents = envFileContents.replace(/^(# )?DB_HOST=.*$/m, `DB_HOST=127.0.0.1`);
      envFileContents = envFileContents.replace(/^(# )?DB_PORT=.*$/m, `DB_PORT=5432`);
      envFileContents = envFileContents.replace(/^(# )?DB_DATABASE=.*$/m, `DB_DATABASE=test\n# DB_PREFIX=\nDB_SCHEMA=public`);
      envFileContents = envFileContents.replace(/^(# )?DB_USERNAME=.*$/m, `DB_USERNAME=root`);
      envFileContents = envFileContents.replace(/^(# )?DB_PASSWORD=.*$/m, `DB_PASSWORD=mysecretpassword\nDB_CHARSET=utf8`);
    }
    if (this.answers.dbms === 'sqlsrv') {
      envFileContents = envFileContents.replace(/^DB_CONNECTION=.*$/m, `DB_CONNECTION=sqlsrv`);
      envFileContents = envFileContents.replace(/^(# )?DB_HOST=.*$/m, `DB_HOST=127.0.0.1`);
      envFileContents = envFileContents.replace(/^(# )?DB_PORT=.*$/m, `DB_PORT=1433`);
      envFileContents = envFileContents.replace(/^(# )?DB_DATABASE=.*$/m, `DB_DATABASE=test\n# DB_PREFIX=`);
      envFileContents = envFileContents.replace(/^(# )?DB_USERNAME=.*$/m, `DB_USERNAME=sa`);
      envFileContents = envFileContents.replace(/^(# )?DB_PASSWORD=.*$/m, `DB_PASSWORD=Pass@word\nDB_CHARSET=utf8`);
    }
    fs.writeFileSync(`${this.destinationPath('server')}/.env`, envFileContents, { encoding: 'utf8', flag: 'w' });
    let configDatabaseFileContents = fs.readFileSync(`${this.destinationPath('server')}/config/database.php`, { encoding: 'utf8', flag: 'r' });
    configDatabaseFileContents = configDatabaseFileContents.replace(/(?<=^\s+)'search_path' => 'public',$/gmis, `'search_path' => env('DB_SCHEMA','public'),`);
    configDatabaseFileContents = configDatabaseFileContents.replace(/(?<=^\s+)'prefix' => '',$/gmis, `'prefix' => env('DB_PREFIX',''),`);
    fs.writeFileSync(`${this.destinationPath('server')}/config/database.php`, configDatabaseFileContents, { encoding: 'utf8', flag: 'w' });
    // this.log(envFileContents.replace(/^([^=]+)(=.*)$/gm, colors.cyan('$1') + colors.whiteBright('$2')));
    this.fs.copyTpl(this.templatePath("package.json.ejs"), this.destinationPath("package.json"),
      {
        packageName: to.slug(this.answers.name),
        projectName: to.title(this.answers.name),
        projectDescription: this.projectDescription,
        projectVersion: this.projectVersion,
        authorName: this.authorName
      });

    // Enable Facades and Eloquent
    const bootPath = `${this.destinationPath('server/bootstrap/app.php')}`;
    let bootContent = fs.readFileSync(bootPath, { encoding: 'utf8', flag: 'r' });
    bootContent = bootContent.replace(/^\/\/ (\$app->withFacades\(\);)/m, '$1');
    bootContent = bootContent.replace(/^\/\/ (\$app->withEloquent\(\);)/m, '$1');
    fs.writeFileSync(`${this.destinationPath('server/bootstrap/app.php')}`, bootContent, { encoding: 'utf8', flag: 'w' });
  }
};