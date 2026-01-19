import to from 'to-case';
import pluralize from 'pluralize';
import { AcRule } from '../../utils/AcRule.js';
import { createTable } from './createTable.js';
import { createRelation } from './createRelation.js';
import { generatePivotMigrations } from './generatePivotMigrations.js';

export class MigrationsGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = that.fs.readJSON(that.destinationPath('.pninja/Entities.json'));
        this.baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
    }

    createTables() {
        const { enums, entities } = this.parsedJDL;
        const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_entity';
        for (const entity of [AcRule, ...entities]) {
            createTable({ entity, enums, that: this.that });
        }
        this.that.fs.copyTpl(this.that.templatePath("database/migrations/create_audits_table.php.ejs"), this.that.destinationPath(`server/database/migrations/${baseTimestamp}_001_create_audits_table.php`), {
            authentication: this.that.config.get('authentication'),
        });
    }
    createRelations() {
        const { entities, relationships } = this.parsedJDL;
        if (!relationships || relationships.length === 0) return;

        entities.forEach(entity => {
            createRelation({ entity, relationships, that: this.that });
        });
    }

    createPivotMigrations() {
        generatePivotMigrations({ relationships: this.parsedJDL.relationships, that: this.that });
    }

    generateMigrations() {
        this.createTables();
        this.createRelations();
        this.createPivotMigrations();
    }
}