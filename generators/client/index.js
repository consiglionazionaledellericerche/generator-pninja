import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import { createReactClient } from './react.inc.js';
import { hello } from '../utils/hello.js';
import { LANGUAGES, DEFAULT_LANGUAGE, getAvailableLanguages } from './config/languages.js';
const tab = '    ';
export default class AuthGenerator extends Generator {
    static namespace = 'pninja:client';

    constructor(args, opts) {
        super(args, opts);
        this.option('fromMain', {
            type: Boolean,
            default: false
        });
        if (!this.options.fromMain) hello(this.log);
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
                    { name: 'Vue', value: 'vue', disabled: "Not implemented yet" },
                    { name: 'Angular', value: 'angular', disabled: "Not implemented yet" },
                    { name: 'No client', value: false, disabled: "Not implemented yet" }
                ]
            }, {
                store: true,
                type: "list",
                name: "nativeLanguage",
                message: `Please choose the ${colors.yellow('*native language*')} of the application`,
                default: this.config.get('nativeLanguage') || DEFAULT_LANGUAGE,
                choices: LANGUAGES
            }, {
                store: true,
                type: 'checkbox',
                name: 'languages',
                message: 'Please choose additional languages to install',
                default: this.config.get('languages') || [],
                choices: (answers) => {
                    return getAvailableLanguages(answers.nativeLanguage);
                },
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
        const parsedJDL = this.fs.readJSON(this.destinationPath(`.pninja/Entities.json`));
        if (this.config.get('clientType') === 'react') return await createReactClient(this, parsedJDL);
    }
};
