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
    const dbPwd = pwd();
    const dbRootPwd = pwd(32);
    const appName = this.config.get('name');
    const slugName = to.slug(appName);
    const snakeName = to.snake(appName);
    const dbms = this.config.get('dbms');
    let envFileContents = this.fs.read(`${this.destinationPath('server')}/.env`, { encoding: 'utf8', flag: 'r' });
    this.fs.copyTpl(this.templatePath('nginx/Dockerfile.ejs'), this.destinationPath('docker/nginx/Dockerfile'), {});
    this.fs.copyTpl(this.templatePath('nginx/nginx.conf.ejs'), this.destinationPath('docker/nginx/nginx.conf'), { name: slugName });
    this.fs.copyTpl(this.templatePath('server/Dockerfile.ejs'), this.destinationPath('docker/server/Dockerfile'), { dbms });
    this.fs.copyTpl(this.templatePath('docker-compose.yml.ejs'), this.destinationPath('docker/docker-compose.yml'), {
      slugName,
      snakeName,
      dbms,
      dbPwd,
      dbRootPwd,
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
    this.fs.write(this.destinationPath('docker/server/.env'), envFileContents, { encoding: 'utf8', flag: 'w' });
  }
}