import to from 'to-case';
import pluralize from 'pluralize';

const tab = (n) => (Array(n)).fill('    ').join('');
// const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
const baseTimestamp = '0001_01_01_235959' + '_pninja_entity';

export function createRelation({ entity, relationships, that }) {
    const up = [];
    const down = [];
    const entityTable = pluralize(to.snake(entity.name))
    // OneToOne Relations
    relationships
        .filter(relation => (relation.cardinality === 'OneToOne' && relation.from.name === entity.name))
        .forEach(relation => {
            const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
            const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
            const fromTabName = pluralize(to.snake(relation.from.name));
            const toTabName = pluralize(to.snake(relation.to.name));
            const foreignId = `${fromInjectedField}_id`;
            const unique = true;
            const nullable = !relation.from.required;
            up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
            down.push(`$table->dropForeign(['${foreignId}']);`);
        });
    // OneToMany Relations
    relationships
        .filter(relation => (relation.cardinality === 'OneToMany' && relation.to.name === entity.name))
        .forEach(relation => {
            const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
            const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
            const fromTabName = pluralize(to.snake(relation.from.name));
            const toTabName = pluralize(to.snake(relation.to.name));
            const foreignId = `${toInjectedField}_id`;
            const unique = false;
            const nullable = !relation.from.required;
            up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${fromTabName}')->nullOnDelete();`);
            down.push(`$table->dropForeign(['${foreignId}']);`);
        });
    // ManyToOne Relations
    relationships
        .filter(relation => (relation.cardinality === 'ManyToOne' && relation.from.name === entity.name))
        .forEach(relation => {
            const fromInjectedField = to.snake(relation.from.injectedField || relation.to.name);
            const toInjectedField = to.snake(relation.to.injectedField || relation.from.name);
            const fromTabName = pluralize(to.snake(relation.from.name));
            const toTabName = pluralize(to.snake(relation.to.name));
            const foreignId = `${fromInjectedField}_id`;
            const unique = false;
            const nullable = !relation.from.required;
            up.push(`$table->foreignId('${foreignId}')${unique ? '->unique()' : ''}->nullable()->constrained('${toTabName}')->nullOnDelete();`);
            down.push(`$table->dropForeign(['${foreignId}']);`);
        });
    that.fs.copyTpl(that.templatePath("migration_create_relations.php.ejs"), that.destinationPath(`server/database/migrations/${baseTimestamp}_002_add_relationships_to_${entityTable}_table.php`),
        {
            entityTable: entityTable,
            up: up.join(`\n${tab(3)}`),
            down: down.join(`\n${tab(3)}`),
        }
    )
}