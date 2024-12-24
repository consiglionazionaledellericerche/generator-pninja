import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { parseFromFiles } = require('jhipster-core');
import path from 'path';

// Funzione principale per la conversione
export async function convertJDLtoJSON(inputFile, outputFile) {
    try {
        // Verifica che il file di input esista
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Il file di input ${inputFile} non esiste`);
        }

        // Parsing del file JDL
        const parsedJDL = parseFromFiles([inputFile]);

        // Creazione dell'oggetto risultante
        const result = {
            entities: parsedJDL.entities,
            enums: parsedJDL.enums,
            relationships: parsedJDL.relationships,
            options: parsedJDL.options,
            applications: parsedJDL.applications
        };

        // Conversione in JSON con formattazione
        const jsonContent = JSON.stringify(result, null, 2);

        // Scrittura del file JSON
        fs.writeFileSync(outputFile, jsonContent, 'utf8');

        return result;
    } catch (error) {
        console.error('Errore durante la conversione:', error.message);
        throw error;
    }
}

// Funzione per validare il contenuto JDL
export function validateJDL(jdlContent) {
    try {
        const parsedJDL = parseFromFiles([jdlContent]);
        return {
            isValid: true,
            content: parsedJDL
        };
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}

// Funzione per leggere un file JDL
export function readJDLFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        throw new Error(`Errore nella lettura del file JDL: ${error.message}`);
    }
}