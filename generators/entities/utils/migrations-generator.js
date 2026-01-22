import { AcRule } from '../../utils/AcRule.js';
import { createTable } from './createTable.js';
import { createRelation } from './createRelation.js';
import { generatePivotMigrations } from './generatePivotMigrations.js';
import { getEntities, getEntitiesRelationships, getEnums } from '../../utils/getEntities.js';

export class MigrationsGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = that.fs.readJSON(that.destinationPath('.pninja/Entities.json'));
        // this.baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
        this.baseTimestamp = '0001_01_01_235959' + '_pninja_entity';
    }

    createTables() {
        const entities = getEntities(this.that);
        const enums = getEnums(this.that);
        for (const entity of [AcRule, ...entities]) {
            createTable({ entity, enums, that: this.that });
        }
        this.that.fs.copyTpl(this.that.templatePath("database/migrations/create_audits_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${this.baseTimestamp}_001_create_audits_table.php`), {
            authentication: this.that.config.get('authentication'),
        });
    }
    createRelations() {
        const entities = getEntities(this.that);
        const relationships = getEntitiesRelationships(this.that);
        if (!relationships || relationships.length === 0) return;

        entities.forEach(entity => {
            createRelation({ entity, relationships, that: this.that });
        });
    }

    createPivotMigrations() {
        const relationships = getEntitiesRelationships(this.that);
        generatePivotMigrations({ relationships, that: this.that });
    }

    generateMigrations() {
        this.createTables();
        this.createRelations();
        this.createPivotMigrations();
    }
}