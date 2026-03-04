import Generator from 'yeoman-generator';
import ora from 'ora';
import colors from 'ansi-colors';
import randomstring from 'randomstring';
import { getEntities } from '../utils/entities-utils.js';

export default class LockingGenerator extends Generator {
    static namespace = 'pninja:locking';

    constructor(args, opts) {
        super(args, opts);
        this.option('fromMain', { type: Boolean, default: false });
        this.option('fromEntity', { type: Boolean, default: false });
        this.option('locking', {
            type: String,
            description: 'The locking strategy to use (none, optimistic, pessimistic, both)',
        });
        if (!this.options.fromMain && !this.options.fromEntity) {
            throw new Error("This generator should not be run directly. Please use the main generator to run this.");
        }
    }

    async prompting() {
        if (this.options.locking) {
            this.answers = { locking: this.options.locking };
            return;
        }
        if (this.options.fromMain) {
            this.answers = await this.prompt([{
                store: true,
                type: 'list',
                name: 'locking',
                message: `Which ${colors.yellow('*Record Locking*')} strategy would you like to use?`,
                default: this.config.get('locking') || 'none',
                choices: [
                    { name: `None ${colors.dim('(No locking - last write wins)')}`, value: 'none' },
                    { name: `Optimistic ${colors.dim('(Conflict detected at save time, diff shown to user)')}`, value: 'optimistic' },
                    { name: `Pessimistic ${colors.dim('(Record locked on open, read-only for others until released)')}`, value: 'pessimistic' },
                    { name: `Both ${colors.dim('(Pessimistic lock + optimistic version check as safety net)')}`, value: 'both' },
                ]
            }]);
        }
    }

    configuring() {
        if (this.options.fromMain) {
            for (const key in this.answers) this.config.set(key, this.answers[key]);
            this.config.save();
        }
    }

    async writing() {
        const locking = this.config.get('locking');
        if (locking === 'none') return;

        const spinner = ora('Generating locking configuration').start();
        const usePessimistic = locking === 'pessimistic' || locking === 'both';
        const useOptimistic = locking === 'optimistic' || locking === 'both';
        const ttlMinutes = 15;
        const heartbeatSeconds = 120;
        const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_000_' + randomstring.generate(5);


        if (this.options.fromMain) {
            this.fs.copyTpl(
                this.templatePath('server/database/migrations/create_record_locks_table.php.ejs'),
                this.destinationPath(`server/database/migrations/${baseTimestamp}_create_record_locks_table.php`),
                { usePessimistic, useOptimistic }
            );
        }
        this.fs.copyTpl(
            this.templatePath('server/app/Models/RecordLock.php.ejs'),
            this.destinationPath('server/app/Models/RecordLock.php'),
            { usePessimistic, useOptimistic, ttlMinutes }
        );
        this.fs.copyTpl(
            this.templatePath('server/app/Traits/Lockable.php.ejs'),
            this.destinationPath('server/app/Traits/Lockable.php'),
            { usePessimistic, useOptimistic }
        );
        this.fs.copyTpl(
            this.templatePath('server/app/Http/Controllers/RecordLockController.php.ejs'),
            this.destinationPath('server/app/Http/Controllers/RecordLockController.php'),
            { usePessimistic, useOptimistic, ttlMinutes }
        );
        if (usePessimistic) {
            this.fs.copyTpl(
                this.templatePath('server/app/Jobs/CleanExpiredLocksJob.php.ejs'),
                this.destinationPath('server/app/Jobs/CleanExpiredLocksJob.php'),
                {}
            );
        }
        this.fs.copyTpl(
            this.templatePath('client/hooks/useRecordLock.ts.ejs'),
            this.destinationPath('client/src/hooks/useRecordLock.ts'),
            { usePessimistic, useOptimistic, ttlMinutes, heartbeatSeconds }
        );
        if (usePessimistic) {
            this.fs.copyTpl(
                this.templatePath('client/components/LockBanner.tsx.ejs'),
                this.destinationPath('client/src/components/LockBanner.tsx'),
                { ttlMinutes }
            );
        }
        if (useOptimistic) {
            this.fs.copyTpl(
                this.templatePath('client/components/ConflictDiffModal.tsx.ejs'),
                this.destinationPath('client/src/components/ConflictDiffModal.tsx'),
                {}
            );
        }
        this.fs.copyTpl(
            this.templatePath('server/config/locking.php.ejs'),
            this.destinationPath('server/config/locking.php'),
            { entities: getEntities(this) }
        );
        this.fs.copyTpl(
            this.templatePath('client/src/pages/admin/RecordLockList.tsx.ejs'),
            this.destinationPath('client/src/pages/admin/RecordLockList.tsx'),
        );

        spinner.succeed('Locking configuration successfully generated');
    }
}