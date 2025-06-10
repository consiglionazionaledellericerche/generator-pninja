import to from 'to-case';
import pluralize from 'pluralize';
import { parseJDL } from '../../utils/jdlParser.js';

export class RoutersGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseJDL(this.entitiesFilePath);
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateRouters() {
        const { entities } = this.parsedJDL;
        const eRoutes = entities.map(entity => {
            const className = entity.name;
            const rootPath = to.slug(pluralize(entity.name));
            return {
                className,
                rootPath,
            };
        });
        entities.forEach(entity => {
            const className = entity.name;
            const rootPath = to.slug(pluralize(entity.name));
            this.that.fs.copyTpl(this.that.templatePath("entity_router.php.ejs"), this.that.destinationPath(`server/routes/${rootPath}.php`),
                {
                    className,
                    rootPath,
                });
        });
        this.that.fs.copyTpl(
            this.that.templatePath("api.php.ejs"),
            this.that.destinationPath(`server/routes/api.php`),
            { eRoutes, paths: entities.map(entity => to.slug(pluralize(entity.name))) },
        );
    }
}