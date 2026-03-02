import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import { createReactClient } from './react.inc.js';
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
        this.option('clientType', {
            type: String,
            description: 'The type of client to use',
        });
        this.option('nativeLanguage', {
            type: String,
            description: 'The native language of the application',
        });
        this.option('languages', {
            type: String,
            description: 'Additional languages to install (comma separated OR "none")',
        });
        if (!this.options.fromMain) throw new Error("This generator should not be run directly. Please use the main generator to run this.");
    }
    async prompting() {
        if (this.options.clientType && this.options.nativeLanguage && this.options.languages) {
            this.answers = {
                clientType: this.options.clientType,
                nativeLanguage: this.options.nativeLanguage,
                languages: this.options.languages === "none" ? [] : this.options.languages.split(',').map(lang => lang.trim())
            };
            return;
        }
        let prompts = [];
        if (this.options["fromMain"] || true) {
            prompts = [...prompts, ...[{
                store: true,
                type: "list",
                name: "clientType",
                message: `Which ${colors.yellow('*Framework*')} would you like to use for the client?`,
                default: this.options.clientType || this.config.get('clientType') || 'react',
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
                default: this.options.nativeLanguage || this.config.get('nativeLanguage') || DEFAULT_LANGUAGE,
                choices: LANGUAGES
            }, {
                store: true,
                type: 'checkbox',
                name: 'languages',
                message: 'Please choose additional languages to install',
                default: this.options.languages ? (this.options.languages === "none" ? [] : this.options.languages.split(',').map(lang => lang.trim())) : (this.config.get('languages') || []),
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
        if (this.config.get('clientType') === 'react') return await createReactClient(this);
    }
};
