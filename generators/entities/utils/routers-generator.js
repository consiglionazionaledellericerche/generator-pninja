import to from 'to-case';
import pluralize from 'pluralize';
import { AcRule } from '../../utils/AcRule.js';
import { getEntities } from '../../utils/getEntities.js';

const entityHasBlob = (entity) => entity.fields.reduce((acc, prop) => {
    if (['Blob', 'AnyBlob', 'ImageBlob'].includes(prop.type)) {
        return true;
    }
    return acc;
}, false);


export class RoutersGenerator {
    constructor(that) {
        this.that = that;
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateRouters() {
        const entities = getEntities(this.that);
        const eRoutesEntities = [AcRule, ...entities].map(entity => {
            const className = entity.name;
            const rootPath = to.slug(pluralize(entity.name));
            const hasBlob = entityHasBlob(entity);
            return {
                className,
                rootPath,
                hasBlob,
            };
        });
        const eRoutesTrash = entities.filter(entity => !!entity.softDelete).map(entity => {
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
        this.that.fs.copyTpl(this.that.templatePath("routes/api.php.ejs"), this.that.destinationPath(`server/routes/api.php`), { eRoutes, paths: [...entities, AcRule].map(entity => to.slug(pluralize(entity.name))) });
        this.that.fs.copyTpl(this.that.templatePath("routes/console.php.ejs"), this.that.destinationPath(`server/routes/console.php`), {
            searchEngine: this.that.config.get('searchEngine'),
        });
    }
}