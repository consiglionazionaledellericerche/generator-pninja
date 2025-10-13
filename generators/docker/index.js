import Generator from 'yeoman-generator';
import to from 'to-case';
import { randomBytes } from 'node:crypto'
import fs from 'node:fs';
import path from 'node:path';

const pwd = (n = 16, a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@%^*_-+=') => [...randomBytes(n)].map(b => a[b % a.length]).join('')
export default class DockerGenerator extends Generator {
  static namespace = 'pninja:docker';

  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
  }

  async writing() {
    const dbPwd = pwd(1, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') + pwd(31);
    const dbRootPwd = pwd(1, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') + pwd(31);
    const meiliMasterKey = pwd(1, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') + pwd(31);
    const typesenseApiKey = pwd(1, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') + pwd(31);
    const appName = this.config.get('name');
    const slugName = to.slug(appName);
    const snakeName = to.snake(appName);
    const dbms = this.config.get('dbms');
    const searchEngine = this.config.get('searchEngine');
    let envFileContents = this.fs.read(`${this.destinationPath('server')}/.env`, { encoding: 'utf8', flag: 'r' });
    this.fs.copyTpl(this.templatePath('nginx/Dockerfile.ejs'), this.destinationPath('docker/nginx/Dockerfile'), {});
    this.fs.copyTpl(this.templatePath('nginx/nginx.conf.ejs'), this.destinationPath('docker/nginx/nginx.conf'), { name: slugName });
    this.fs.copyTpl(this.templatePath('server/Dockerfile.ejs'), this.destinationPath('docker/server/Dockerfile'), { dbms, searchEngine });
    this.fs.copyTpl(this.templatePath('docker-compose.yml.ejs'), this.destinationPath('docker/docker-compose.yml'), {
      slugName,
      snakeName,
      dbms,
      dbPwd,
      dbRootPwd,
      searchEngine,
      meiliMasterKey,
      typesenseApiKey,
    });
    if (['pgsql', 'mysql', 'mariadb'].includes(dbms)) {
      envFileContents = envFileContents.replace(/^DB_HOST=.*$/m, `DB_HOST=database`);
      envFileContents = envFileContents.replace(/^DB_DATABASE=.*$/m, `DB_DATABASE=${snakeName}`);
      envFileContents = envFileContents.replace(/^DB_USERNAME=.*$/m, `DB_USERNAME=${snakeName}_user`);
      envFileContents = envFileContents.replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD="${dbPwd}"`);
    }
    if (dbms === 'sqlite') {
      const filePath = this.destinationPath('docker/database/database.sqlite');
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, '');
      fs.chmodSync(filePath, 0o666);
    }
    if (searchEngine === 'meilisearch') {
      envFileContents = envFileContents.replace(/^MEILISEARCH_HOST=.*$/m, `MEILISEARCH_HOST=http://meilisearch:7700`);
      envFileContents = envFileContents.replace(/^MEILISEARCH_KEY=.*$/m, `MEILISEARCH_KEY=${meiliMasterKey}`);
    }
    if (searchEngine === 'elastic') {
      envFileContents = envFileContents.replace(/^ELASTIC_HOST=.*$/m, `ELASTIC_HOST=http://elasticsearch:9200`);
    }
    if (searchEngine === 'solr') {
      envFileContents = envFileContents.replace(/^SOLR_HOST=.*$/m, `SOLR_HOST=solr`);
    }
    if (searchEngine === 'typesense') {
      envFileContents = envFileContents.replace(/^TYPESENSE_HOST=.*$/m, `TYPESENSE_HOST=typesense`);
      envFileContents = envFileContents.replace(/^TYPESENSE_API_KEY=.*$/m, `TYPESENSE_API_KEY=${typesenseApiKey}`);
    }
    this.fs.write(this.destinationPath('docker/server/.env'), envFileContents, { encoding: 'utf8', flag: 'w' });
  }
}