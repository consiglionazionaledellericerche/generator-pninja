import Generator from 'yeoman-generator';
import to from 'to-case';

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
    const appName = this.config.get('name');
    this.fs.copyTpl(this.templatePath('nginx/Dockerfile.ejs'), this.destinationPath('docker/nginx/Dockerfile'), {});
    this.fs.copyTpl(this.templatePath('nginx/nginx.conf.ejs'), this.destinationPath('docker/nginx/nginx.conf'), { name: to.slug(appName) });
    this.fs.copyTpl(this.templatePath('server/Dockerfile.ejs'), this.destinationPath('docker/server/Dockerfile'), {});
    this.fs.copyTpl(this.templatePath('docker-compose.yml.ejs'), this.destinationPath('docker/docker-compose.yml'), { name: to.slug(appName) });
  }
}