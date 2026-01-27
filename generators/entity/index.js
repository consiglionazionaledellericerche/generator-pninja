// generators/entity/index.js
import path from 'path';
import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import to from 'to-case';
import pluralize from 'pluralize';
import fs from 'fs';
import { getEntitiesNames, getEnumsNames, getEnums, getEntitiesRelationships, getEntity } from '../utils/getEntities.js';
import { MigrationsGenerator } from '../entities/utils/migrations-generator.js';
import { ModelsGenerator } from '../entities/utils/models-generator.js';

export default class extends Generator {
    constructor(args, opts) {
        super(args, opts);

        this.argument('entityName', {
            type: String,
            required: false,
            description: 'Entity name'
        });

        this.entityConfig = {
            name: undefined,
            tableName: undefined,
            softDelete: undefined,
            icon: undefined,
            fields: [],
            relationships: []
        };

        this.fieldCounter = 0;
        this.relationshipCounter = 0;
    }

    async prompting() {
        this.log(colors.blue('\nGenerating a new entity\n'));

        if (!this.options.entityName) {
            const nameAnswer = await this.prompt([{
                type: 'input',
                name: 'entityName',
                message: 'Entity name:',
                validate: input => input.length > 0 || 'Entity name is required'
            }]);
            this.entityName = nameAnswer.entityName;
        } else {
            this.entityName = this.options.entityName;
        }

        const softDeleteAnswer = await this.prompt([{
            type: 'confirm',
            name: 'softDelete',
            message: 'Do you want to enable soft delete?',
            default: true
        }]);

        const iconAnswer = await this.prompt([{
            type: 'input',
            name: 'icon',
            message: 'Icon name:',
            default: 'asterisk'
        }]);

        this.entityConfig.name = this.entityName;
        this.entityConfig.tableName = this.entityName;
        this.entityConfig.softDelete = softDeleteAnswer.softDelete;
        this.entityConfig.icon = iconAnswer.icon;

        this._loadExistingEntities();
        this._loadExistingEnums();

        await this._askForFields();

        this._printEntitySummary();
        this.log(colors.cyan('\nGenerating relationships to other entities\n'));

        await this._askForRelationships();

        this._printEntitySummary();
    }

    _loadExistingEntities() {
        this.existingEntities = getEntitiesNames(this);
    }

    _loadExistingEnums() {
        this.existingEnums = getEnumsNames(this);
    }

    async _askForFields() {
        this.fieldCounter++;
        this.log(colors.cyan(`\nGenerating field #${this.fieldCounter}\n`));

        const addFieldAnswer = await this.prompt([{
            type: 'confirm',
            name: 'addField',
            message: 'Do you want to add a field to your entity?',
            default: true
        }]);

        if (!addFieldAnswer.addField) {
            return;
        }

        const fieldAnswers = await this.prompt([
            {
                type: 'input',
                name: 'fieldName',
                message: 'What is the name of your field?',
                validate: input => input.length > 0 || 'Field name is required'
            },
            {
                type: 'list',
                name: 'fieldType',
                message: 'What is the type of your field?',
                choices: [
                    'String',
                    'Integer',
                    'Long',
                    'BigDecimal',
                    'Float',
                    'Double',
                    'Boolean',
                    'LocalDate',
                    'ZonedDateTime',
                    'Instant',
                    'Duration',
                    'LocalTime',
                    'UUID',
                    'Blob',
                    'AnyBlob',
                    'ImageBlob',
                    'TextBlob',
                    ...this.existingEnums
                ]
            }
        ]);

        const field = {
            name: fieldAnswers.fieldName,
            type: fieldAnswers.fieldType,
            validations: []
        };

        const validationAnswer = await this.prompt([{
            type: 'checkbox',
            name: 'validationRules',
            message: 'Which validation rules would you like to add?',
            choices: this._getValidationChoices(fieldAnswers.fieldType)
        }]);

        // Ask for validation rule values
        for (const rule of validationAnswer.validationRules) {
            const validation = { key: rule, value: '' };

            if (['minlength', 'maxlength', 'min', 'max', 'minbytes', 'maxbytes', 'pattern'].includes(rule)) {
                const valueAnswer = await this.prompt([{
                    type: 'input',
                    name: 'value',
                    message: `What is the ${rule} value?`,
                    default: this._getValidationDefault(rule)
                }]);
                validation.value = valueAnswer.value;
            }

            field.validations.push(validation);
        }

        this.entityConfig.fields.push(field);

        this._printEntitySummary();

        await this._askForFields();
    }

    async _askForRelationships() {
        this.relationshipCounter++;

        const addRelationshipAnswer = await this.prompt([{
            type: 'confirm',
            name: 'addRelationship',
            message: 'Do you want to add a relationship to another entity?',
            default: true
        }]);

        if (!addRelationshipAnswer.addRelationship) {
            return;
        }

        const relationshipAnswers = await this.prompt([
            {
                type: 'list',
                name: 'otherEntity',
                message: 'What is the other entity?',
                choices: this.existingEntities
            },
            {
                type: 'list',
                name: 'relationshipType',
                message: 'What is the type of the relationship?',
                choices: [
                    'many-to-one',
                    'many-to-many',
                    'one-to-one',
                    'one-to-many'
                ]
            },
            {
                type: 'input',
                name: 'relationshipName',
                message: 'What is the name of the relationship?',
                default: answers => {
                    const sentenceCase = to.sentence(answers.otherEntity);
                    return answers.relationshipType.endsWith('to-many')
                        ? to.camel(pluralize(sentenceCase))
                        : to.camel(sentenceCase);
                }
            }
        ]);

        const relationship = {
            entityName: this.entityName,
            relationshipName: relationshipAnswers.relationshipName,
            otherEntityName: relationshipAnswers.otherEntity,
            relationshipType: relationshipAnswers.relationshipType
        };

        const otherEntityFields = this._getEntityFields(relationshipAnswers.otherEntity);

        const displayFieldAnswer = await this.prompt([{
            type: 'list',
            name: 'otherEntityField',
            message: `When you display this relationship in '${this.entityName}', which field from '${relationshipAnswers.otherEntity}' do you want to use?`,
            choices: otherEntityFields,
            default: 'id'
        }]);
        relationship.otherEntityField = displayFieldAnswer.otherEntityField;

        const requiredAnswer = await this.prompt([{
            type: 'confirm',
            name: 'relationshipRequired',
            message: 'Is this relationship required?',
            default: false
        }]);
        relationship.relationshipRequired = requiredAnswer.relationshipRequired;

        const bidirectionalAnswer = await this.prompt([{
            type: 'confirm',
            name: 'bidirectional',
            message: 'Do you want to generate a bidirectional relationship?',
            default: true
        }]);
        relationship.bidirectional = bidirectionalAnswer.bidirectional;

        if (bidirectionalAnswer.bidirectional) {
            const inverseRelationType = this._getInverseRelationType(relationshipAnswers.relationshipType);

            const bidirectionalAnswers = await this.prompt([{
                type: 'input',
                name: 'otherEntityRelationshipName',
                message: 'What is the name of this relationship in the other entity?',
                default: () => {
                    const sentenceCase = to.sentence(this.entityName);
                    return inverseRelationType.endsWith('to-many')
                        ? to.camel(pluralize(sentenceCase))
                        : to.camel(sentenceCase);
                }
            }]);
            relationship.otherEntityRelationshipName = bidirectionalAnswers.otherEntityRelationshipName;

            const currentEntityFields = this._getEntityFields(this.entityName);

            const inverseDisplayFieldAnswer = await this.prompt([{
                type: 'list',
                name: 'inverseEntityField',
                message: `When you display this relationship in '${relationshipAnswers.otherEntity}', which field from '${this.entityName}' do you want to use?`,
                choices: currentEntityFields,
                default: 'id'
            }]);
            relationship.inverseEntityField = inverseDisplayFieldAnswer.inverseEntityField;

            const inverseRequiredAnswer = await this.prompt([{
                type: 'confirm',
                name: 'inverseRelationshipRequired',
                message: 'Is the inverse relationship required?',
                default: false
            }]);
            relationship.inverseRelationshipRequired = inverseRequiredAnswer.inverseRelationshipRequired;
        }

        this.entityConfig.relationships.push(relationship);

        this.log(colors.cyan('\nGenerating relationships to other entities\n'));
        this._printEntitySummary();

        await this._askForRelationships();
    }

    _getInverseRelationType(relationType) {
        const inverseMap = {
            'many-to-one': 'one-to-many',
            'one-to-many': 'many-to-one',
            'many-to-many': 'many-to-many',
            'one-to-one': 'one-to-one'
        };
        return inverseMap[relationType] || relationType;
    }

    _printEntitySummary() {
        this.log('\n' + '='.repeat(17) + ' ' + colors.bold(colors.cyan(this.entityName)) + ' ' + '='.repeat(17));

        const softDeleteStatus = this.entityConfig.softDelete ? 'enabled' : 'disabled';
        this.log(`${colors.bold('Soft delete:')} ${colors.yellow(softDeleteStatus)}`);
        this.log(`${colors.bold('Icon:')} ${colors.yellow(this.entityConfig.icon)}`);

        this.log(colors.bold('Fields:'));
        if (this.entityConfig.fields.length === 0) {
            this.log('(no fields)');
        } else {
            this.entityConfig.fields.forEach(field => {
                let fieldLine = `${colors.cyan(field.name)} (${field.type})`;
                if (field.validations && field.validations.length > 0) {
                    const validationParts = field.validations.map(v => {
                        return v.value ? `${v.key}=${v.value}` : v.key;
                    });
                    fieldLine += ' ' + colors.yellow(validationParts.join(' '));
                }
                this.log(fieldLine);
            });
        }

        if (this.entityConfig.relationships.length > 0) {
            this.log(colors.bold('Relationships:'));
            this.entityConfig.relationships.forEach(rel => {
                let relLine = `${colors.cyan(rel.relationshipName)} (${rel.otherEntityName}) ${colors.green(rel.relationshipType)}`;
                const validations = [];
                if (rel.relationshipRequired) {
                    validations.push('required');
                }
                if (rel.inverseRelationshipRequired) {
                    validations.push('inverse-required');
                }
                if (validations.length > 0) {
                    relLine += ' ' + colors.yellow(validations.join(' '));
                }
                this.log(relLine);
            });
        }

        this.log('');
    }

    _getValidationChoices(fieldType) {
        // For enums, only required and unique are allowed
        if (this.existingEnums.includes(fieldType)) {
            return [
                { name: 'required', value: 'required' },
                { name: 'unique', value: 'unique' }
            ];
        }

        const choices = [
            { name: 'required', value: 'required' },
            { name: 'unique', value: 'unique' }
        ];

        if (fieldType === 'String') {
            choices.push(
                { name: 'minlength', value: 'minlength' },
                { name: 'maxlength', value: 'maxlength' },
                { name: 'pattern', value: 'pattern' }
            );
        }

        if (['Integer', 'Long', 'BigDecimal', 'Float', 'Double'].includes(fieldType)) {
            choices.push(
                { name: 'min', value: 'min' },
                { name: 'max', value: 'max' }
            );
        }

        if (['Blob', 'AnyBlob', 'ImageBlob', 'TextBlob'].includes(fieldType)) {
            choices.push(
                { name: 'minbytes', value: 'minbytes' },
                { name: 'maxbytes', value: 'maxbytes' }
            );
        }

        return choices;
    }

    _getValidationDefault(rule) {
        const defaults = {
            minlength: '2',
            maxlength: '20',
            pattern: '^[a-zA-Z0-9]*$',
            min: '0',
            max: '100',
            minbytes: '10',
            maxbytes: '1000'
        };
        return defaults[rule] || '';
    }

    _getEntityFields(entityName) {
        if (entityName === this.entityName) {
            const fields = this.entityConfig.fields
                .filter(f => !f.type.includes('Blob'))
                .map(f => f.name);

            return ['id', ...fields];
        }

        // Read from individual entity file
        const entityFilePath = this.destinationPath(`.pninja/${entityName}.json`);

        if (!fs.existsSync(entityFilePath)) {
            return ['id'];
        }

        const entityData = JSON.parse(fs.readFileSync(entityFilePath, 'utf8'));

        if (!entityData.fields) {
            return ['id'];
        }

        const fields = entityData.fields
            .filter(f => !f.type.includes('Blob'))
            .map(f => f.name);

        return ['id', ...fields];
    }

    writing() {
        this.log(colors.green('\nEntity configuration completed'));
        const enums = getEnums(this);
        const storedRelationships = getEntitiesRelationships(this);

        // Save entity configuration to .pninja/<EntityName>.json
        const entityFilePath = this.destinationPath(`.pninja/${this.entityName}.json`);
        this.fs.writeJSON(entityFilePath, this.entityConfig, null, 2);

        this.log(colors.green(`Entity configuration saved to ${entityFilePath}`));

        const relationships = this.entityConfig.relationships || [];

        // Generate migrations
        const migrationsGenerator = new MigrationsGenerator(this);
        migrationsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
        migrationsGenerator.createTable({ entity: this.entityConfig, enums });
        if (relationships.length > 0) {
            migrationsGenerator.createRelation({ entity: this.entityConfig, relationships });
            relationships.filter(rel => rel.relationshipType === 'one-to-many').map(rel => ({
                name: rel.otherEntityName
            })).forEach(relEntity => migrationsGenerator.createRelation({ entity: relEntity, relationships }));
            migrationsGenerator.generatePivotMigrations(relationships);
        }
        this.log(colors.green('Migrations generated successfully\n'));

        // Generate models
        const modelsGenerator = new ModelsGenerator(this);
        modelsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
        modelsGenerator.generateModel(this.entityConfig, enums, relationships, this.config.get('searchEngine'));
        relationships
            .filter(rel => rel.relationshipType === 'many-to-one')
            .map(rel => rel.otherEntityName)
            .forEach(entityName => {
                const entity = getEntity(this, entityName);
                console.log('Generating relation for entity:', entityName, entity);
                if (entity) {
                    modelsGenerator.generateModel(entity, enums, [...storedRelationships, ...relationships], this.config.get('searchEngine'));
                }
            });
        this.log(colors.green('Models generated successfully\n'));
    }
}