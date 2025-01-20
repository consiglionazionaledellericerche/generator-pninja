import to from 'to-case';
import pluralize from 'pluralize';
import jhipsterCore from 'jhipster-core';
const { parseFromFiles } = jhipsterCore;

export class RoutersGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseFromFiles([this.entitiesFilePath]);
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateRouters() {
        const { entities } = this.parsedJDL;
        entities.forEach(entity => {
            const className = entity.name;
            const rootPath = to.slug(pluralize(entity.name));
            this.that.fs.copyTpl(this.that.templatePath("entity_router.php.ejs"), this.that.destinationPath(`server/routes/${rootPath}.php`),
                {
                    className,
                    rootPath,
                });
            this.that.fs.append(this.that.destinationPath(`server/routes/api.php`), `\nrequire __DIR__ . '/${rootPath}.php';`);
        });
    }
}