import Generator from 'yeoman-generator';
import randomstring from 'randomstring';
import { hello } from '../utils/hello.js';
import { MigrationsGenerator } from '../entities/utils/migrations-generator.js';
import { ModelsGenerator } from '../entities/utils/models-generator.js';
import { ControllersGenerator } from '../entities/utils/controllers-generator.js';
import { AcRule } from '../utils/AcRule.js';

function sortJdlStructure(jdl) {
  // Create a deep copy to avoid modifying the original
  const sorted = JSON.parse(JSON.stringify(jdl));

  // Sort entities by name
  sorted.entities.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Sort relationships by from.name, then to.name, then cardinality
  sorted.relationships.sort((a, b) => {
    // First compare from.name
    const fromCompare = a.from.name.localeCompare(b.from.name, undefined, { sensitivity: 'base' });
    if (fromCompare !== 0) return fromCompare;

    // If from.name is equal, compare to.name
    const toCompare = a.to.name.localeCompare(b.to.name, undefined, { sensitivity: 'base' });
    if (toCompare !== 0) return toCompare;

    // If to.name is also equal, compare cardinality
    return a.cardinality.localeCompare(b.cardinality, undefined, { sensitivity: 'base' });
  });

  return sorted;
}

export default class ServerGenerator extends Generator {
  static namespace = 'pninja:server';
  constructor(args, opts) {
    super(args, opts);
    this.option('fromMain', {
      type: Boolean,
      default: false
    });
    this.baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
    if (!this.options.fromMain) hello(this.log);
  }

  async writing() {
    // const serverTemplatePath = this.templatePath();
    const entitiesTemplatePath = this.templatePath() + '/../../entities/templates';
    const migrationsGenerator = new MigrationsGenerator(this);
    const modelsGenerator = new ModelsGenerator(this);
    const controllersGenerator = new ControllersGenerator(this);
    controllersGenerator.that.sourceRoot(entitiesTemplatePath);
    const searchEngine = this.config.get('searchEngine');
    migrationsGenerator.createTable({ entity: AcRule, enums: [] });
    this.fs.copyTpl(this.templatePath("database/migrations/create_audits_table.php.ejs"), this.destinationPath(`server/database/migrations/${this.baseTimestamp}_001_${randomstring.generate(5)}_create_audits_table.php`), {
      authentication: this.config.get('authentication'),
    });
    modelsGenerator.generateModel(AcRule, [], [], searchEngine);
    controllersGenerator.generateEntityController(AcRule, [], searchEngine);
    this.fs.copyTpl(this.templatePath("routes/api.php.ejs"), this.destinationPath(`server/routes/api.php`), {
      eRoutes: [{ className: 'AcRule', rootPath: 'ac-rules', hasBlob: false }],
      paths: ['ac-rules'],
    });
    this.fs.copyTpl(this.templatePath("routes/console.php.ejs"), this.destinationPath(`server/routes/console.php`), {
      searchEngine: searchEngine,
    });

    this.fs.copyTpl(
      this.templatePath("DatabaseSeeder.php.ejs"),
      this.destinationPath(`server/database/seeders/DatabaseSeeder.php`),
      { entities: [AcRule], manyToMany: [], n: 0 }
    );

    this.fs.copyTpl(this.templatePath("database/seeders/csv/AcRule.csv.ejs"), this.destinationPath(`server/database/seeders/csv/AcRule.csv`), { entities: [] });
    this.fs.copyTpl(this.templatePath("ApiErrorHandler.php.ejs"), this.destinationPath(`server/app/Exceptions/ApiErrorHandler.php`), {});
    this.fs.copyTpl(this.templatePath("NotFoundErrorHandler.php.ejs"), this.destinationPath(`server/app/Exceptions/NotFoundErrorHandler.php`), {});
    this.fs.copyTpl(this.templatePath("DatabaseErrorHandler.php.ejs"), this.destinationPath(`server/app/Exceptions/DatabaseErrorHandler.php`), {});
    this.fs.copyTpl(this.templatePath("ValidationErrorHandler.php.ejs"), this.destinationPath(`server/app/Exceptions/ValidationErrorHandler.php`), {});
    this.fs.copyTpl(this.templatePath("Providers/AppServiceProvider.php.ejs"), this.destinationPath(`server/app/Providers/AppServiceProvider.php`), {});
    this.fs.copyTpl(this.templatePath("HandlesApiErrors.php.ejs"), this.destinationPath(`server/app/Traits/HandlesApiErrors.php`), {});
    this.fs.copyTpl(this.templatePath("HandlesUserRoles.php.ejs"), this.destinationPath(`server/app/Traits/HandlesUserRoles.php`));
    this.fs.copyTpl(this.templatePath(".gitkeep.ejs"), this.destinationPath(`server/storage/app/private/uploads/.gitkeep`));
    this.fs.copyTpl(this.templatePath(".gitkeep.ejs"), this.destinationPath(`server/storage/app/public/uploads/.gitkeep`));
    this.fs.copyTpl(this.templatePath("app/Http/Middleware/AccessControl.php.ejs"), this.destinationPath(`server/app/Http/Middleware/AccessControl.php`));
    this.fs.copyTpl(this.templatePath("app/Http/Middleware/SessionAuth.php.ejs"), this.destinationPath(`server/app/Http/Middleware/SessionAuth.php`));
    this.fs.copyTpl(this.templatePath("app.php.ejs"), this.destinationPath(`server/bootstrap/app.php`));
    this.fs.copyTpl(this.templatePath("filesystems.php.ejs"), this.destinationPath(`server/config/filesystems.php`));
    this.fs.copyTpl(this.templatePath("config/audit.php.ejs"), this.destinationPath('server/config/audit.php'), {
      authenticationProvider: this.config.get('authentication')
    });
    this.fs.copyTpl(this.templatePath("config/lauthz-rbac-model.conf"), this.destinationPath('server/config/lauthz-rbac-model.conf'));
    this.fs.copyTpl(this.templatePath("config/lauthz.php"), this.destinationPath('server/config/lauthz.php'));
    if (this.config.get('authentication') === 'keycloak') {
      this.fs.copyTpl(this.templatePath("app/Resolvers/Keycloak__UserResolver.php.ejs"), this.destinationPath(`server/app/Resolvers/UserResolver.php`));
    }
  }
  end() { }
};
