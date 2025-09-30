import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import to from 'to-case';
import { randomBytes } from 'node:crypto'
import fs from 'node:fs';
import path from 'node:path';

export default class SearchGenerator extends Generator {
  static namespace = 'pninja:search';

  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
  }

  async prompting() {
    let prompts = [];
    if (this.options["fromMain"] || true) {
      prompts = [...prompts, ...[{
        store: true,
        type: "list",
        name: "searchEngine",
        message: `Which ${colors.yellow('*Search Engine*')} would you like to use?`,
        default: this.config.get('searchEngine') || 'database',
        choices: [
          { name: 'Database', value: 'database' },
          { name: 'Elasticsearch', value: 'elastic' },
          { name: 'Meilisearch', value: 'meilisearch', disabled: "Not implemented yet" },
          { name: 'Typesense', value: 'typesense', disabled: "Not implemented yet" },
          { name: 'No Search Engine', value: "null", disabled: "Not implemented yet" }
        ]
      }]]
    }
    this.answers = await this.prompt(prompts);
  }

  configuring() {
    for (const key in this.answers) {
      this.config.set(key, this.answers[key]);
    }
    this.config.save();
  }

  async writing() {
    const appName = this.config.get('name');
    const snakeName = to.snake(appName);
    if (this.answers.searchEngine === 'elastic') {
      this.spawnCommandSync('composer', ['require', 'babenkoivan/elastic-scout-driver'], { cwd: 'server' });
    }
    let searchEngineConfig = `
SCOUT_DRIVER=${this.answers.searchEngine}
SCOUT_QUEUE=false`;
    if (['meilisearch', 'typesense', 'elastic'].includes(this.answers.searchEngine)) {
      searchEngineConfig += `
SCOUT_PREFIX=${snakeName}_`;
    }
    if (this.answers.searchEngine === 'elastic') {
      searchEngineConfig += `
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=`;
    }
    searchEngineConfig += "\n";
    const envContent = this.fs.read(this.destinationPath(`server/.env`));
    this.fs.write(this.destinationPath('server/.env'), envContent + "\n" + searchEngineConfig, { encoding: 'utf8', flag: 'w' });
    this.fs.copyTpl(this.templatePath('server/config/scout.php.ejs'), this.destinationPath('server/config/scout.php'));
    if (this.answers.searchEngine === 'elastic') {
      this.fs.copyTpl(this.templatePath('server/config/elastic.client.php.ejs'), this.destinationPath('server/config/elastic.client.php'));
    }
  }
}