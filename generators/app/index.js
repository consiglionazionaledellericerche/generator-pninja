import Generator from 'yeoman-generator';
import fs from 'fs';
import to from 'to-case';
import colors from 'ansi-colors';
import randomstring from 'randomstring';
import path from 'path';
import { fileURLToPath } from 'url';
import { hello } from '../utils/hello.js';

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
    hello(this.log);
    this.log(`\n${colors.whiteBright('Application files will be generated in folder:')} ${colors.yellow(process.env.PWD)}\n`);

    // sub generator Auth
    const authGeneratorPath = path.resolve(__dirname, '../auth/index.js');
    const { default: AuthGenerator } = await import(authGeneratorPath);

    await this.composeWith({
      Generator: AuthGenerator,
      path: path.dirname(authGeneratorPath)
    }, {
      fromMain: true,
      env: this.env,
      resolved: authGeneratorPath,
      namespace: 'pninja:auth'
    });

    // sub generator Entities
    const entitiesGeneratorPath = path.resolve(__dirname, '../entities/index.js');
    const { default: EntitiesGenerator } = await import(entitiesGeneratorPath);

    await this.composeWith({
      Generator: EntitiesGenerator,
      path: path.dirname(entitiesGeneratorPath)
    }, {
      fromMain: true,
      env: this.env,
      resolved: entitiesGeneratorPath,
      namespace: 'pninja:entities'
    });

    // sub generator Client
    const clientGeneratorPath = path.resolve(__dirname, '../client/index.js');
    const { default: ClientGenerator } = await import(clientGeneratorPath);
    await this.composeWith({
      Generator: ClientGenerator,
      path: path.dirname(clientGeneratorPath)
    }, {
      fromMain: true,
      env: this.env,
      resolved: clientGeneratorPath,
      namespace: 'pninja:client'
    });

    // sub generator Search
    const searchGeneratorPath = path.resolve(__dirname, '../search/index.js');
    const { default: SearchGenerator } = await import(searchGeneratorPath);

    await this.composeWith({
      Generator: SearchGenerator,
      path: path.dirname(searchGeneratorPath)
    }, {
      fromMain: true,
      env: this.env,
      resolved: searchGeneratorPath,
      namespace: 'pninja:search'
    });

    // sub generator Docker
    const dockerGeneratorPath = path.resolve(__dirname, '../docker/index.js');
    const { default: DockerGenerator } = await import(dockerGeneratorPath);

    await this.composeWith({
      Generator: DockerGenerator,
      path: path.dirname(dockerGeneratorPath)
    }, {
      fromMain: true,
      env: this.env,
      resolved: dockerGeneratorPath,
      namespace: 'pninja:docker'
    });

    // sub generator Final
    const finalGeneratorPath = path.resolve(__dirname, '../final/index.js');
    const { default: FinalGenerator } = await import(finalGeneratorPath);

    await this.composeWith({
      Generator: FinalGenerator,
      path: path.dirname(finalGeneratorPath)
    }, {
      fromMain: true,
      env: this.env,
      resolved: finalGeneratorPath,
      namespace: 'pninja:final'
    });
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
            name: `SQLite ${colors.dim('(Lightweight, serverless, file-based)')}`,
            value: "sqlite"
          },
          {
            name: `MySQL ${colors.dim('(Popular, open-source, widely supported)')}`,
            value: "mysql"
          },
          {
            name: `MariaDB ${colors.dim('(MySQL fork, open-source, drop-in replacement)')}`,
            value: "mariadb"
          },
          {
            name: `PostgreSQL ${colors.dim('(Advanced, feature-rich, standards-compliant)')}`,
            value: "pgsql"
          },
          {
            name: `SQL Server ${colors.dim('(Microsoft enterprise database (licensed))')}`,
            value: "sqlsrv",
            disabled: "Not implemented yet"
          },
          {
            name: `Oracle ${colors.dim('(Enterprise-grade (commercial license required))')}`,
            value: "oracle",
            disabled: "Not implemented yet"
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
            name: "Yarn",
            value: "yarn",
            disabled: "Not implemented yet"
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
    this.fs.copyTpl(this.templatePath(`README.md.ejs`), this.destinationPath(`README.md`), { appName: this.config.get('name') });
    this.spawnCommandSync('composer', ['create-project', '--prefer-dist', 'laravel/laravel=~11.6.1', 'server']);
    // this.spawnCommandSync('composer', ['require', 'laravel/scout'], { cwd: 'server' });
    this.spawnCommandSync('composer', ['require', '--dev', 'beyondcode/laravel-dump-server'], { cwd: 'server' });
    this.spawnCommandSync('php', ['artisan', 'install:api', '--without-migration-prompt'], { cwd: 'server' });
    // this.spawnCommandSync('php', ['artisan', 'vendor:publish', '--provider="Laravel\Scout\ScoutServiceProvider"'], { cwd: 'server' });
    this.fs.copyTpl(this.templatePath("rename_queue_table.php.ejs"), this.destinationPath(`server/database/migrations/${new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17)}_rename_queue_table.php`));
    let queueConfigFileContents = fs.readFileSync(`${this.destinationPath('server/config/queue.php')}`, { encoding: 'utf8', flag: 'r' });
    queueConfigFileContents = queueConfigFileContents.replace(`'table' => env('DB_QUEUE_TABLE', 'jobs'),`, `'table' => env('DB_QUEUE_TABLE', 'queue__jobs'),`);
    queueConfigFileContents = queueConfigFileContents.replace(`'table' => 'job_batches',`, `'table' => 'queue__job_batches',`);
    queueConfigFileContents = queueConfigFileContents.replace(`'table' => 'failed_jobs',`, `'table' => 'queue__failed_jobs',`);
    fs.writeFileSync(this.destinationPath(`${this.destinationPath('server/config/queue.php')}`), queueConfigFileContents, { encoding: 'utf8', flag: 'w' });
    let envFileContents = fs.readFileSync(`${this.destinationPath('server')}/.env`, { encoding: 'utf8', flag: 'r' });
    envFileContents = envFileContents.replace(/^APP_NAME=.*$/m, `APP_NAME=${to.constant(this.answers.name)}`);
    envFileContents = envFileContents.replace(/^APP_KEY=.*$/m, `APP_KEY=${randomstring.generate()}`);
    if (this.answers.dbms === 'sqlite') {
      envFileContents = envFileContents.replace(/^DB_CONNECTION=.*$/m, `DB_CONNECTION=sqlite`);
      envFileContents = envFileContents.replace(/^(# )?DB_DATABASE=.*$/m, `DB_DATABASE=database/database.sqlite`);
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
    fs.writeFileSync(this.destinationPath('server/.env'), envFileContents, { encoding: 'utf8', flag: 'w' });
    let configDatabaseFileContents = fs.readFileSync(`${this.destinationPath('server')}/config/database.php`, { encoding: 'utf8', flag: 'r' });
    configDatabaseFileContents = configDatabaseFileContents.replace(/(?<=^\s+)'search_path' => 'public',$/gmis, `'search_path' => env('DB_SCHEMA','public'),`);
    configDatabaseFileContents = configDatabaseFileContents.replace(/(?<=^\s+)'prefix' => '',$/gmis, `'prefix' => env('DB_PREFIX',''),`);
    fs.writeFileSync(`${this.destinationPath('server')}/config/database.php`, configDatabaseFileContents, { encoding: 'utf8', flag: 'w' });
    this.fs.copyTpl(this.templatePath("package.json.ejs"), this.destinationPath("package.json"),
      {
        packageName: to.slug(this.answers.name),
        projectName: to.title(this.answers.name),
        projectDescription: this.projectDescription,
        projectVersion: this.projectVersion,
        authorName: this.authorName,
        searchEngine: this.config.get('searchEngine') || 'none',
      });
    this.fs.copyTpl(this.templatePath(".gitignore.ejs"), this.destinationPath(".gitignore"));
    // Enable Facades and Eloquent
    const bootPath = `${this.destinationPath('server/bootstrap/app.php')}`;
    let bootContent = fs.readFileSync(bootPath, { encoding: 'utf8', flag: 'r' });
    bootContent = bootContent.replace(/^\/\/ (\$app->withFacades\(\);)/m, '$1');
    bootContent = bootContent.replace(/^\/\/ (\$app->withEloquent\(\);)/m, '$1');
    fs.writeFileSync(`${this.destinationPath('server/bootstrap/app.php')}`, bootContent, { encoding: 'utf8', flag: 'w' });
  }
};