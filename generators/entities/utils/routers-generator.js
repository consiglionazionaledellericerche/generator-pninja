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
        const eRoutesEntities = entities.map(entity => {
            const className = entity.name;
            const rootPath = to.slug(pluralize(entity.name));
            const hasBlob = entityHasBlob(entity);
            return {
                className,
                rootPath,
                hasBlob,
            };
        });
        const eRoutesTrash = entities.filter(entity => entity.annotations?.some(
            ann => ann.optionName === 'softDelete' && ann.type === 'UNARY'
        )).map(entity => {
            const className = `Trashed${entity.name}`;
            const rootPath = `trashed-${to.slug(pluralize(entity.name))}`;
            const hasBlob = false;
            return {
                className,
                rootPath,
                hasBlob,
            };
        });
        const eRoutes = [...eRoutesEntities, ...eRoutesTrash];
        this.that.fs.copyTpl(this.that.templatePath("routes/api.php.ejs"), this.that.destinationPath(`server/routes/api.php`), { eRoutes, paths: entities.map(entity => to.slug(pluralize(entity.name))) });
        this.that.fs.copyTpl(this.that.templatePath("routes/console.php.ejs"), this.that.destinationPath(`server/routes/console.php`));
    }
}