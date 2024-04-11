'use strict';
var Generator = require('yeoman-generator');
const fs = require('fs');
const to = require('to-case');
const colors = require('ansi-colors');
const tab = '    ';
const {createVueClient} = require('./vue.inc');
module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);
    }
    async prompting() {
        let prompts = [];
        if(this.options["fromMain"]) {
            prompts = [...prompts, ...[{
                store: true,
                type: "list",
                name: "clientType",
                message: `Which ${colors.yellow('*Framework*')} would you like to use for the client?`,
                choices: [
                    {name: 'Vue', value: 'vue'},
                    {name: 'React (Not implemented yet)', value: 'react'},
                    {name: 'Angular (Not implemented yet)', value: 'angular'},
                    {name: 'No client', value: false}
                ]
            }]]
        }
        this.answers = await this.prompt(prompts);
    }
    
    configuring() {
        for(const key in this.answers){
            this.config.set(key, this.answers[key]);
        }
        this.config.save();
    }
    
    async writing() {
        if(this.answers.clientType === 'vue') createVueClient(this);
    }
};
