import to from 'to-case';
import pluralize from 'pluralize';
const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';

export function generatePivotMigrations({ relationships, that }) {
    relationships
        .filter(relationship => relationship.cardinality === 'ManyToMany')
        .map(relation => {
            const fromForeignId = to.snake(relation.from.injectedField || relation.to.name);
            const toForeignId = to.snake(relation.to.injectedField || relation.from.name);
            const fromTabName = pluralize(to.snake(relation.from.name));
            const toTabName = pluralize(to.snake(relation.to.name));
            const pivotName = [to.snake(relation.from.name), to.snake(relation.to.name)].sort().join('_');
            const nullable = !relation.from.required;
            return {
                fromForeignId,
                toForeignId,
                fromTabName,
                toTabName,
                pivotName,
                nullable
            }
        }).map(migration => that.fs.copyTpl(that.templatePath("migration_create_pivot_table.php.ejs"), that.destinationPath(`server/database/migrations/${baseTimestamp}_003_create_${migration.pivotName}_table.php`),
            {
                fromForeignId: migration.fromForeignId,
                toForeignId: migration.toForeignId,
                fromTabName: migration.fromTabName,
                toTabName: migration.toTabName,
                pivotName: migration.pivotName,
                nullable: migration.nullable
            }
        ));
}

