import to from 'to-case';
import pluralize from 'pluralize';
import jhipsterCore from 'jhipster-core';
import jclrz from 'json-colorz';
const { parseFromFiles } = jhipsterCore;

export class ControllersGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseFromFiles([this.entitiesFilePath]);
    }
    tab = (n = 1) => (Array(n)).fill('    ').join('');

    generateControllers() {
        const { enums, entities, relationships } = this.parsedJDL;
        for (const entity of entities) {
            const withs = [];
            relationships.forEach(relation => {
                if (relation.cardinality === 'OneToOne') {
                    if (!relation.from.injectedField && !relation.to.injectedField) {
                        relation.to.injectedField = relation.from.name;
                    }
                    relation.from.injectedField = relation.from.injectedField || relation.to.name;
                }
                return relation;
            })

            // OneToOne direct relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne' && relation.from.name === entity.name
            )).forEach(relation => {
                withs.push(`'${to.snake(relation.from.injectedField)}'`);
            });

            // OneToOne reverse relationships
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne' && relation.to.name === entity.name
                && (!!relation.to.injectedField || (!relation.from.injectedField && !relation.to.injectedField))
            )).forEach(relation => {
                withs.push(`'${to.snake(relation.to.injectedField || relation.from.name)}'`);
            });


            this.that.fs.copyTpl(this.that.templatePath("entity_controller.php.ejs"), this.that.destinationPath(`server/app/Http/Controllers/${entity.name}Controller.php`),
                {
                    className: entity.name,
                    entityName: to.camel(entity.name),
                    withs: withs.length ? `[${withs.join(', ')}]` : null, // (_.compact([...withs, ...inverseWiths]).length) ? `['${_.compact([...withs, ...inverseWiths]).join(`','`)}']` : null,
                    createRelated: [], //_.compact([...createRelated, ...createInverseRelated]).join("\n\n\t\t")
                });
        }
    }
}