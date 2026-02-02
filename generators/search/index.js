import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import to from 'to-case';
import pluralize from 'pluralize';
import { AcRule } from '../utils/AcRule.js';
import { getEntities } from '../utils/entities-utils.js';

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
    this.answers = await this.prompt([
      {
        store: true,
        type: "list",
        name: "searchEngine",
        message: `Which ${colors.yellow('*Search Engine*')} would you like to use?`,
        default: this.config.get('searchEngine') || 'database',
        choices: [
          { name: `Database ${colors.dim('(Built-in search, limited features, no setup required)')}`, value: 'database' },
          { name: `Algolia ${colors.dim('(Hosted SaaS, blazing fast, easy setup, free tier limits)')}`, value: 'algolia' },
          { name: `Elasticsearch ${colors.dim('(Self-hosted, industry standard, highly scalable, complex setup)')}`, value: 'elastic' },
          { name: `Meilisearch ${colors.dim('(Self-hosted, instant search, typo-tolerant, easy to deploy)')}`, value: 'meilisearch' },
          { name: `Typesense ${colors.dim('(Self-hosted, typo-tolerant, <50ms search, minimal resources)')}`, value: 'typesense' },
          { name: `Solr ${colors.dim('(Self-hosted, mature, enterprise-ready, rich feature set)')}`, value: 'solr' },
          { name: `None ${colors.dim('(No search/filtering features - sure about that? 🤔)')}`, value: "null" },
        ]
      }
    ]);
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
    if (searchEngine !== 'null') {
      await this.spawn('composer', ['require', 'laravel/scout'], { cwd: 'server' });
    }
    if (searchEngine === 'elastic') {
      await this.spawn('composer', ['require', 'babenkoivan/elastic-migrations'], { cwd: 'server' });
      await this.spawn('composer', ['require', 'babenkoivan/elastic-scout-driver'], { cwd: 'server' });
      await this.spawn('php', ['artisan', 'vendor:publish', '--provider="Elastic\Migrations\ServiceProvider"'], { cwd: 'server' });
    }
    if (searchEngine === 'meilisearch') {
      await this.spawn('composer', ['require', 'meilisearch/meilisearch-php'], { cwd: 'server' });
      await this.spawn('composer', ['require', 'http-interop/http-factory-guzzle'], { cwd: 'server' });
    }
    if (searchEngine === 'typesense') {
      await this.spawn('composer', ['require', 'typesense/typesense-php'], { cwd: 'server' });
    }
    if (searchEngine === 'algolia') {
      await this.spawn('composer', ['require', 'algolia/algoliasearch-client-php'], { cwd: 'server' });
    }
    if (searchEngine === 'solr') {
      await this.spawn('composer', ['require', 'klaasie/scout-solr-engine'], { cwd: 'server' });
    }
    let searchEngineConfig = `
SCOUT_DRIVER=${searchEngine}
SCOUT_QUEUE=false`;
    if (['meilisearch', 'typesense', 'elastic', 'solr'].includes(searchEngine)) {
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
    if (searchEngine === 'solr') {
      searchEngineConfig += `
SOLR_HOST=localhost
SOLR_PORT=8983
SOLR_PATH=/`;
    }
    searchEngineConfig += "\n";
    if (searchEngine !== 'null') {
      const envContent = this.fs.read(this.destinationPath(`server/.env`));
      this.fs.write(this.destinationPath('server/.env'), envContent + "\n" + searchEngineConfig, { encoding: 'utf8', flag: 'w' });
    }
    const entities = getEntities(this);
    const mailiserachIndexSettings = searchEngine === 'meilisearch' ? [...entities, AcRule].reduce((res, entity) => {
      const indexName = `${entity.tableName}`;
      res += `
            '${indexName}' => [
                'sortableAttributes' => ['id','${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => to.snake(f.name)).join("', '")}'],
                'rankingRules' => ['sort', 'words', 'typo', 'proximity', 'attribute', 'exactness']
            ],`;
      return res;
    }
      , '') : '';

    const typesenseModelSettings = searchEngine === 'typesense' ? `
        'model-settings' => [${[...entities, AcRule].map(entity => `
            ${entity.name}::class => [
                'collection-schema' => [
                    'fields' => [
                      ['name' => '__id', 'type' => 'int32', 'sort' => true],
                      ${entity.fields.filter(f => !['Blob', 'AnyBlob', 'ImageBlob'].includes(f.type)).map(f => `['name' => '${to.snake(f.name)}', 'type' => 'string', 'optional' => true, 'sort' => true, 'infix' => ${['String', 'TextBlob', 'LocalDate', 'ZonedDateTime', 'Instant', 'Duration', 'LocalTime'].includes(f.type) ? 'true' : 'false'}]`).join(",\n                      ")}
                    ],
                ],
            ]`).join(",")}
        ],` : '';

    if (searchEngine !== 'null') {
      this.fs.copyTpl(this.templatePath('server/config/scout.php.ejs'), this.destinationPath('server/config/scout.php'), {
        entities: [...entities, AcRule],
        searchEngine: searchEngine,
        mailiserachIndexSettings,
        typesenseModelSettings
      });
    }
    if (searchEngine === 'elastic') {
      this.fs.copyTpl(this.templatePath('server/config/elastic.client.php.ejs'), this.destinationPath('server/config/elastic.client.php'));
    }
    if (searchEngine === 'elastic') {
      const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17);
      for (const entity of [...entities, AcRule]) {
        const indexName = entity.tableName;
        this.fs.copyTpl(this.templatePath("elastic/migrations/create_entity_index.php.ejs"), this.destinationPath(`server/elastic/migrations/${baseTimestamp}_create_${indexName}_index.php`),
          {
            className: pluralize(entity.name),
            indexName: indexName,
            columns: entity.fields.reduce((res, field) => {
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