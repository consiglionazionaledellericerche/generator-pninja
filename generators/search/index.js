import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import to from 'to-case';
import pluralize from 'pluralize';
import { parseJDL } from '../utils/jdlParser.js';

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
          { name: `Database ${colors.gray('(Built-in database search, no external deps)')}`, value: 'database' },
          { name: `Algolia ${colors.gray('(Hosted search-as-a-service, free tier limits apply)')}`, value: 'algolia' },
          { name: `Elasticsearch ${colors.gray('(Self-hosted, powerful full-text search)')}`, value: 'elastic' },
          { name: `Meilisearch ${colors.gray('(Self-hosted, fast & typo-tolerant)')}`, value: 'meilisearch' },
          { name: `Typesense ${colors.gray('(Self-hosted, low-latency & typo-tolerant)')}`, value: 'typesense' },
          { name: `Solr ${colors.gray('(Self-hosted, enterprise Apache Lucene)')}`, value: 'solr', disabled: "Not implemented yet" },
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
    const searchEngine = this.answers.searchEngine;
    if (searchEngine === 'elastic') {
      this.spawnCommandSync('composer', ['require', 'babenkoivan/elastic-migrations'], { cwd: 'server' });
      this.spawnCommandSync('composer', ['require', 'babenkoivan/elastic-scout-driver'], { cwd: 'server' });
      this.spawnCommandSync('php', ['artisan', 'vendor:publish', '--provider="Elastic\Migrations\ServiceProvider"'], { cwd: 'server' });
    }
    if (searchEngine === 'meilisearch') {
      this.spawnCommandSync('composer', ['require', 'meilisearch/meilisearch-php'], { cwd: 'server' });
      this.spawnCommandSync('composer', ['require', 'http-interop/http-factory-guzzle'], { cwd: 'server' });
    }
    if (searchEngine === 'typesense') {
      this.spawnCommandSync('composer', ['require', 'typesense/typesense-php'], { cwd: 'server' });
    }
    if (searchEngine === 'algolia') {
      this.spawnCommandSync('composer', ['require', 'algolia/algoliasearch-client-php'], { cwd: 'server' });
    }
    let searchEngineConfig = `
SCOUT_DRIVER=${searchEngine}
SCOUT_QUEUE=false`;
    if (['meilisearch', 'typesense', 'elastic'].includes(searchEngine)) {
      searchEngineConfig += `
SCOUT_PREFIX=${snakeName}_`;
    }
    if (searchEngine === 'elastic') {
      searchEngineConfig += `
ELASTIC_HOST=http://localhost:9200`;
    }
    if (searchEngine === 'meilisearch') {
      searchEngineConfig += `
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=meilisearch-master-key-change-me`;
    }
    if (searchEngine === 'typesense') {
      searchEngineConfig += `
TYPESENSE_API_KEY=xyz
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http`;
    }
    if (searchEngine === 'algolia') {
      searchEngineConfig += `
ALGOLIA_APP_ID=your-application-id
ALGOLIA_SECRET=your-admin-api-key`;
    }
    searchEngineConfig += "\n";
    const envContent = this.fs.read(this.destinationPath(`server/.env`));
    this.fs.write(this.destinationPath('server/.env'), envContent + "\n" + searchEngineConfig, { encoding: 'utf8', flag: 'w' });
    const { entities } = parseJDL(this.config.get('entitiesFilePath'));
    const mailiserachIndexSettings = searchEngine === 'meilisearch' ? entities.reduce((res, entity) => {
      const indexName = `${to.snake(pluralize(entity.tableName))}`;
      res += `
            '${indexName}' => [
                'sortableAttributes' => ['id','${entity.body.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => to.snake(f.name)).join("', '")}'],
                'rankingRules' => ['sort', 'words', 'typo', 'proximity', 'attribute', 'exactness']
            ],`;
      return res;
    }
      , '') : '';

    const typesenseModelSettings = searchEngine === 'typesense' ? `
        'model-settings' => [${entities.map(entity => `
            ${entity.name}::class => [
                'collection-schema' => [
                    'fields' => [
                      ['name' => '__id', 'type' => 'int32', 'sort' => true],
                      ${entity.body.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => `['name' => '${to.snake(f.name)}', 'type' => 'string', 'optional' => true, 'sort' => true, 'infix' => ${['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'true' : 'false'}]`).join(",\n                      ")}
                    ],
                ],
            ]`).join(",")}
        ],` : '';

    this.fs.copyTpl(this.templatePath('server/config/scout.php.ejs'), this.destinationPath('server/config/scout.php'), {
      entities,
      searchEngine: searchEngine,
      mailiserachIndexSettings,
      typesenseModelSettings
    });
    if (searchEngine === 'elastic') {
      this.fs.copyTpl(this.templatePath('server/config/elastic.client.php.ejs'), this.destinationPath('server/config/elastic.client.php'));
    }
    if (searchEngine === 'elastic') {
      const { entities } = parseJDL(this.config.get('entitiesFilePath'));
      const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17);
      for (const entity of entities) {
        const indexName = to.snake(pluralize(entity.tableName));
        this.fs.copyTpl(this.templatePath("elastic/migrations/create_entity_index.php.ejs"), this.destinationPath(`server/elastic/migrations/${baseTimestamp}_create_${indexName}_index.php`),
          {
            className: pluralize(entity.name),
            indexName: indexName,
            columns: entity.body.reduce((res, field) => {
              if (!['Blob', 'AnyBlob', 'ImageBlob'].includes(field.type)) {
                res.push(to.snake(field.name));
              }
              return res;
            }, []),
          });
      }
    }
  }
}