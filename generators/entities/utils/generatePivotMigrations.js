import to from 'to-case';
import pluralize from 'pluralize';
// const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
const baseTimestamp = '0001_01_01_235959' + '_pninja_entity';

export function generatePivotMigrations({ relationships, that }) {
    relationships
        .filter(relationship => relationship.relationshipType === 'many-to-many')
        .map(relation => {
            const fromForeignId = to.snake(relation.relationshipName || relation.otherEntityName);
            const toForeignId = to.snake(relation.otherEntityRelationshipName || relation.entityName);
            const fromTabName = pluralize(to.snake(relation.entityName));
            const toTabName = pluralize(to.snake(relation.otherEntityName));
            const pivotName = [to.snake(relation.entityName), to.snake(relation.otherEntityName)].sort().join('_');
            return {
                fromForeignId,
                toForeignId,
                fromTabName,
                toTabName,
                pivotName
            }
        }).map(migration => that.fs.copyTpl(that.templatePath("migration_create_pivot_table.php.ejs"), that.destinationPath(`server/database/migrations/${baseTimestamp}_003_create_${migration.pivotName}_table.php`),
            {
                fromForeignId: migration.fromForeignId,
                toForeignId: migration.toForeignId,
                fromTabName: migration.fromTabName,
                toTabName: migration.toTabName,
                pivotName: migration.pivotName
            }
        ));
}

