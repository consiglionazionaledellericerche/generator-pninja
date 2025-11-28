import to from 'to-case';
import pluralize from 'pluralize';

const entityHasBlob = (entity) => entity.body.reduce((acc, prop) => {
    if (['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
        return true;
    }
    return acc;
}, false);


export class RoutersGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = that.fs.readJSON(that.destinationPath('.pninja/Entities.json'));
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateRouters() {
        const { entities } = this.parsedJDL;
        const eRoutes = entities.map(entity => {
            const className = entity.name;
            const rootPath = to.slug(pluralize(entity.name));
            const hasBlob = entityHasBlob(entity);
            return {
                className,
                rootPath,
                hasBlob,
            };
        });
        this.that.fs.copyTpl(
            this.that.templatePath("api.php.ejs"),
            this.that.destinationPath(`server/routes/api.php`),
            { eRoutes, paths: entities.map(entity => to.slug(pluralize(entity.name))) },
        );
    }
}