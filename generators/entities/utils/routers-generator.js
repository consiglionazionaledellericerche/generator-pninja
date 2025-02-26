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
        entities.forEach(entity => {
            const className = entity.name;
            const rootPath = to.slug(pluralize(entity.name));
            this.that.fs.copyTpl(this.that.templatePath("entity_router.php.ejs"), this.that.destinationPath(`server/routes/${rootPath}.php`),
                {
                    className,
                    rootPath,
                });
            let apiPhpContent = this.that.fs.read(this.that.destinationPath(`server/routes/api.php`));
            apiPhpContent = apiPhpContent.replace(`\nrequire __DIR__ . '/${rootPath}.php';`, '');
            apiPhpContent = apiPhpContent + `\nrequire __DIR__ . '/${rootPath}.php';`;
            this.that.fs.write(this.that.destinationPath(`server/routes/api.php`), apiPhpContent);
        });
    }
}