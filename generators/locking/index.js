import Generator from 'yeoman-generator';
import ora from 'ora';
import colors from 'ansi-colors';
import randomstring from 'randomstring';
import { getEntities } from '../utils/entities-utils.js';
import { AcRule } from '../utils/AcRule.js';
import to from 'to-case';
import pluralize from 'pluralize';

export default class LockingGenerator extends Generator {
    static namespace = 'pninja:locking';

    constructor(args, opts) {
        super(args, opts);
        this.option('fromMain', { type: Boolean, default: false });
        this.option('fromEntity', { type: Boolean, default: false });
        this.option('locking', {
            type: Boolean,
            description: 'Enable (pessimistic) record locking',
            default: false,
        });
        if (!this.options.fromMain && !this.options.fromEntity) {
            throw new Error("This generator should not be run directly. Please use the main generator to run this.");
        }
    }

    async prompting() {
        if (this.options.locking !== undefined) {
            this.answers = { locking: this.options.locking };
            return;
        }
        if (this.options.fromMain) {
            this.answers = await this.prompt([{
                store: true,
                type: 'confirm',
                name: 'locking',
                message: `Do you want to enable (pessimistic) ${colors.yellow('*Record Locking*')}?`,
                default: this.config.get('locking') || false,
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
        if (!locking) return;

        const spinner = ora('Generating locking configuration').start();
        const ttlMinutes = 15;
        const heartbeatSeconds = 120;
        const baseTimestamp = new Date().toISOString().replace(/[-T]/g, '_').replace(/:/g, '').slice(0, 17) + '_pninja_000_' + randomstring.generate(5);

        if (this.options.fromMain) {
            this.fs.copyTpl(
                this.templatePath('server/database/migrations/create_record_locks_table.php.ejs'),
                this.destinationPath(`server/database/migrations/${baseTimestamp}_create_record_locks_table.php`),
                { locking }
            );
        }
        this.fs.copyTpl(
            this.templatePath('server/app/Models/RecordLock.php.ejs'),
            this.destinationPath('server/app/Models/RecordLock.php'),
            { locking, ttlMinutes }
        );
        this.fs.copyTpl(
            this.templatePath('server/app/Traits/Lockable.php.ejs'),
            this.destinationPath('server/app/Traits/Lockable.php'),
            { locking }
        );
        this.fs.copyTpl(
            this.templatePath('server/app/Http/Controllers/RecordLockController.php.ejs'),
            this.destinationPath('server/app/Http/Controllers/RecordLockController.php'),
            { locking, ttlMinutes }
        );
        if (locking) {
            this.fs.copyTpl(
                this.templatePath('server/app/Jobs/CleanExpiredLocksJob.php.ejs'),
                this.destinationPath('server/app/Jobs/CleanExpiredLocksJob.php'),
                {}
            );
        }
        this.fs.copyTpl(
            this.templatePath('client/hooks/useRecordLock.ts.ejs'),
            this.destinationPath('client/src/hooks/useRecordLock.ts'),
            { locking, ttlMinutes, heartbeatSeconds }
        );
        if (locking) {
            this.fs.copyTpl(
                this.templatePath('client/components/LockBanner.tsx.ejs'),
                this.destinationPath('client/src/components/LockBanner.tsx'),
                { ttlMinutes }
            );
        }
        this.fs.copyTpl(
            this.templatePath('server/config/locking.php.ejs'),
            this.destinationPath('server/config/locking.php'),
            { entities: [AcRule, ...getEntities(this)], to, pluralize }
        );
        this.fs.copyTpl(
            this.templatePath('client/src/pages/admin/RecordLockList.tsx.ejs'),
            this.destinationPath('client/src/pages/admin/RecordLockList.tsx'),
        );

        spinner.succeed('Locking configuration successfully generated');
    }
}