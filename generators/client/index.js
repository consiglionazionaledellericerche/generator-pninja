import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import { createVueClient } from './vue.inc.js';
import { createReactClient } from './react.inc.js';
import jhipsterCore from 'jhipster-core';
const { parseFromFiles } = jhipsterCore;

const tab = '    ';
export default class AuthGenerator extends Generator {
    static namespace = 'presto:client';

    constructor(args, opts) {
        super(args, opts);
        this.option('fromMain', {
            type: Boolean,
            default: false
        });
    }
    async prompting() {
        let prompts = [];
        if (this.options["fromMain"] || true) {
            prompts = [...prompts, ...[{
                store: true,
                type: "list",
                name: "clientType",
                message: `Which ${colors.yellow('*Framework*')} would you like to use for the client?`,
                default: this.config.get('clientType') || 'vue',
                choices: [
                    { name: 'React', value: 'react' },
                    { name: 'Vue (Not implemented yet)', value: 'vue' },
                    { name: 'Angular (Not implemented yet)', value: 'angular' },
                    { name: 'No client', value: false }
                ]
            }]]
        }
        this.answers = await this.prompt(prompts);
    }

    configuring() {
        for (const key in this.answers) {
            this.config.set(key, this.answers[key]);
        }
        this.config.save();
    }

    async writing() {
        // console.log(this.config.getAll());
        const parsedJDL = parseFromFiles([this.config.get('entitiesFilePath')]);
        if (this.config.get('clientType') === false) return;
        if (this.config.get('clientType') === 'react') return await createReactClient(this, parsedJDL);
        // if (this.config.get('clientType') === 'vue') return await createVueClient(this, parsedJDL);
        console.log(`\n\n${colors.redBright('Not implemented yet')}\n\n`);
    }
};
