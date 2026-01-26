import to from 'to-case';
import pluralize from 'pluralize';

const tab = (n) => (Array(n)).fill('    ').join('');
const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';

export function createRelation({ entity, relationships, that }) {
    const up = [];
    const down = [];
    const entityTable = pluralize(to.snake(entity.name))
    // OneToOne Relations
    relationships
        .filter(relation => (relation.relationshipType === 'one-to-one' && relation.entityName === entity.name))
        .forEach(relation => {
            const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
            const toTabName = pluralize(to.snake(relation.otherEntityName));
            const foreignId = `${fromInjectedField}_id`;
            const unique = true;
            up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
            down.push(`$table->dropForeign(['${foreignId}']);`);
        });
    // OneToMany Relations
    relationships
        .filter(relation => (relation.relationshipType === 'one-to-many' && relation.otherEntityName === entity.name))
        .forEach(relation => {
            const toInjectedField = to.snake(relation.otherEntityRelationshipName || relation.entityName);
            const fromTabName = pluralize(to.snake(relation.entityName));
            const foreignId = `${toInjectedField}_id`;
            const unique = false;
            up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${fromTabName}')->nullOnDelete();`);
            down.push(`$table->dropForeign(['${foreignId}']);`);
        });
    // ManyToOne Relations
    relationships
        .filter(relation => (relation.relationshipType === 'many-to-one' && relation.entityName === entity.name))
        .forEach(relation => {
            const fromInjectedField = to.snake(relation.relationshipName || relation.otherEntityName);
            const toTabName = pluralize(to.snake(relation.otherEntityName));
            const foreignId = `${fromInjectedField}_id`;
            const unique = false;
            up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
            down.push(`$table->dropForeign(['${foreignId}']);`);
        });
    that.fs.copyTpl(that.templatePath("../../entities/templates/migration_create_relations.php.ejs"), that.destinationPath(`server/database/migrations/${baseTimestamp}_002_add_relationships_to_${entityTable}_table.php`),
        {
            entityTable: entityTable,
            up: up.join(`\n${tab(3)}`),
            down: down.join(`\n${tab(3)}`),
        }
    )
}