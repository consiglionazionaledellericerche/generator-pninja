import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Risultato dell'operazione di eliminazione
 * @typedef {Object} DeletionResult
 * @property {string[]} deletedFiles - Lista dei file eliminati
 * @property {string[]} errors - Lista degli errori riscontrati
 * @property {number} totalProcessed - Numero totale di file processati
 */

/**
 * Opzioni per l'eliminazione dei file
 * @typedef {Object} DeleteOptions
 * @property {boolean} [dryRun=false] - Se true, simula l'eliminazione senza effettuarla
 * @property {boolean} [verbose=false] - Se true, logga informazioni dettagliate
 */

export class FileDeleter {
    /**
     * @param {string} directoryPath - Percorso della directory da processare
     * @param {DeleteOptions} [options={}] - Opzioni di configurazione
     */
    constructor(directoryPath, options = {}) {
        this.directoryPath = directoryPath;
        this.options = {
            dryRun: false,
            verbose: false,
            ...options
        };
    }

    /**
     * Elimina i file che corrispondono al pattern regex
     * @param {string|RegExp} regex - Pattern regex per il match dei file
     * @returns {Promise<DeletionResult>} Risultato dell'operazione
     */
    async deleteByPattern(regex) {
        const pattern = typeof regex === 'string' ? new RegExp(regex) : regex;
        const result = {
            deletedFiles: [],
            errors: [],
            totalProcessed: 0
        };

        try {
            const files = await fs.readdir(this.directoryPath);
            result.totalProcessed = files.length;

            for (const file of files) {
                if (pattern.test(file)) {
                    const filePath = join(this.directoryPath, file);

                    try {
                        const stat = await fs.stat(filePath);
                        if (stat.isFile()) {
                            if (!this.options.dryRun) {
                                await fs.unlink(filePath);
                            }
                            result.deletedFiles.push(file);

                            if (this.options.verbose) {
                                console.log(`${this.options.dryRun ? '[SIMULAZIONE] ' : ''}File eliminato: ${file}`);
                            }
                        }
                    } catch (err) {
                        const errorMsg = `Errore con il file ${file}: ${err.message}`;
                        result.errors.push(errorMsg);

                        if (this.options.verbose) {
                            console.error(errorMsg);
                        }
                    }
                }
            }
        } catch (err) {
            throw new Error(`Errore nell'accesso alla directory: ${err.message}`);
        }

        return result;
    }
}