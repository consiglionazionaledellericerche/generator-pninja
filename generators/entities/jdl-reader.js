import fs from 'fs/promises';

export class JDLReader {
    constructor(filePath) {
        this.filePath = filePath;
        this.jdlData = null;
    }

    async load() {
        try {
            const fileContent = await fs.readFile(this.filePath, 'utf-8');
            this.jdlData = JSON.parse(fileContent);
            return this.jdlData;
        } catch (error) {
            throw new Error(`Errore nella lettura del file JDL: ${error.message}`);
        }
    }

    // Metodi di utility per accedere ai dati
    getEntities() {
        return this.jdlData?.entities || [];
    }

    getEntity(entityName) {
        return this.jdlData?.entities?.[entityName];
    }

    getTableName(entityName) {
        return this.jdlData?.entities?.[entityName]?.tableName || entityName;
    }

    getEntityFields(entityName) {
        return this.jdlData?.entities?.[entityName]?.fields || {};
    }

    getRelationships() {
        return this.jdlData?.relationships || {};
    }

    getOptions() {
        return this.jdlData?.options || {};
    }

    getApplications() {
        return this.jdlData?.applications || {};
    }

    // Metodi per analisi più specifiche
    getEntitiesWithTableName() {
        const entities = this.getEntities();
        return Object.entries(entities).reduce((acc, [name, entity]) => {
            if (entity.tableName && entity.tableName !== name) {
                acc[name] = entity.tableName;
            }
            return acc;
        }, {});
    }

    getEntityRelationships(entityName) {
        const relationships = this.getRelationships();
        const entityRelations = {};

        for (const [type, relations] of Object.entries(relationships)) {
            const filtered = relations.filter(rel =>
                rel.from.name === entityName || rel.to.name === entityName
            );
            if (filtered.length > 0) {
                entityRelations[type] = filtered;
            }
        }

        return entityRelations;
    }
}

// // Esempio di utilizzo
// const main = async () => {
//     const reader = new JDLReader('./output.json');

//     try {
//         await reader.load();

//         // Esempio: ottenere tutte le entità con tableName diverso dal name
//         const customTableNames = reader.getEntitiesWithTableName();
//         console.log('Entità con tableName personalizzato:', customTableNames);

//         // Esempio: ottenere i dettagli di una specifica entità
//         const userEntity = reader.getEntity('User');
//         console.log('Dettagli entità User:', userEntity);

//         // Esempio: ottenere le relazioni di una specifica entità
//         const userRelations = reader.getEntityRelationships('User');
//         console.log('Relazioni dell\'entità User:', userRelations);

//     } catch (error) {
//         console.error('Errore:', error.message);
//     }
// };

// // Esegui solo se chiamato direttamente
// if (import.meta.url === new URL(import.meta.url).href) {
//     main();
// }

export default JDLReader;