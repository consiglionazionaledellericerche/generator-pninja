// generators/entity/index.js
import path from 'path';
import Generator from 'yeoman-generator';
import colors from 'ansi-colors';
import to from 'to-case';
import pluralize from 'pluralize';
import fs from 'fs';
import { getEntities, getEntityByName, getEntitiesNames, getEnumsNames, getEnums, getEntitiesRelationships, getEntity } from '../utils/entities-utils.js';
import { AcRule } from '../utils/AcRule.js';
import { MigrationsGenerator } from '../entities/utils/migrations-generator.js';
import { ModelsGenerator } from '../entities/utils/models-generator.js';
import { ControllersGenerator } from '../entities/utils/controllers-generator.js';
import { RoutersGenerator } from '../entities/utils/routers-generator.js';
import { FactoriesGenerator } from '../entities/utils/factories-generator.js';
import { getModelForeignIds } from '../client/utils/getModelForeignIds.js';
import { getModelRelatedEntities } from '../client/utils/getModelRelatedEntities.js';
import { createEntityPages } from '../client/react.inc.js';
import { isReservedWord, isReservedTableName } from '../utils/reserved-words.js';
import { hello } from '../utils/hello.js';

function replaceEntity(entitiesArray, updatedEntity) {
    return entitiesArray.map(entity =>
        entity.name === updatedEntity.name ? updatedEntity : entity
    );
}
function replaceRelationships(relationshipsArray, updatedEntity) {
    return relationshipsArray
        .filter(rel => rel.entityName !== updatedEntity.name)
        .concat(updatedEntity.relationships)
        .sort((a, b) => {
            // First compare entityName
            const entityNameCompare = a.entityName.localeCompare(b.entityName, undefined, { sensitivity: 'base' });
            if (entityNameCompare !== 0) return entityNameCompare;

            // If entityName is equal, compare otherEntityName
            const otherEntityNameCompare = a.otherEntityName.localeCompare(b.otherEntityName, undefined, { sensitivity: 'base' });
            if (otherEntityNameCompare !== 0) return otherEntityNameCompare;

            // If otherEntityName is also equal, compare relationshipType
            return a.relationshipType.localeCompare(b.relationshipType, undefined, { sensitivity: 'base' });
        });
}

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

        hello(this.log);
    }

    async prompting() {
        this.log(colors.blue('\nGenerating a new entity\n'));

        this.isRegenerate = false;
        this.isAdd = false;
        this.isRemove = false;
        this.fieldsToAdd = [];
        this.fieldsToRemove = [];
        this.relationshipsToAdd = [];
        this.relationshipsToRemove = [];

        if (this.options.entityName && !/^[A-Z][A-Za-z0-9]*$/.test(this.options.entityName)) {
            this.log(colors.red(`ERROR! Your entity name must start with an upper case letter and cannot contain special characters: /^[A-Z][A-Za-z0-9]*$/`));
            this.options.entityName = undefined;
        } else if (this.options.entityName && isReservedWord(to.snake(this.options.entityName))) {
            this.log(colors.red(`ERROR! '${this.options.entityName}' is a reserved word and cannot be used as an entity name`));
            this.options.entityName = undefined;
        }
        if (!this.options.entityName) {
            const nameAnswer = await this.prompt([{
                type: 'input',
                name: 'entityName',
                message: 'Entity name:',
                default: this.options.entityName,
                validate: input => {
                    if (input === '') {
                        return 'Your entity name cannot be empty';
                    }
                    if (!/^[A-Z][A-Za-z0-9]*$/.test(input)) {
                        return `Your entity name must start with an upper case letter and cannot contain special characters: /^[A-Z][A-Za-z0-9]*$/`;
                    }
                    if (isReservedWord(to.snake(input))) {
                        return `'${input}' is a reserved word and cannot be used as an entity name`;
                    }
                    return true
                }
            }]);
            this.entityName = nameAnswer.entityName;
        } else {
            this.entityName = this.options.entityName;
        }

        // Check if entity already exists
        const entityFilePath = this.destinationPath(`.pninja/${this.entityName}.json`);
        if (fs.existsSync(entityFilePath)) {
            const updateAnswer = await this.prompt([{
                type: 'list',
                name: 'updateMode',
                message: 'Entity already exists. Do you want to update the entity? This will replace the existing files for this entity, all your custom code will be overwritten',
                choices: [
                    { name: 'Yes, re generate the entity', value: 'regenerate' },
                    { name: 'Yes, add more fields and relationships', value: 'add' },
                    { name: 'Yes, remove fields and relationships', value: 'remove' },
                    { name: 'No, exit', value: 'exit' }
                ]
            }]);

            if (updateAnswer.updateMode === 'exit') {
                this.log(colors.yellow('Entity generation cancelled'));
                process.exit(0);
            }

            // Load existing entity
            const existingEntity = JSON.parse(fs.readFileSync(entityFilePath, 'utf8'));

            if (updateAnswer.updateMode === 'regenerate') {
                // Load existing entity configuration and regenerate everything
                this.entityConfig = existingEntity;
                this.entityName = existingEntity.name;
                this.isRegenerate = true;

                this._loadExistingEntities();
                this._loadExistingEnums();

                this._printEntitySummary();

                // Skip directly to writing phase
                return;
            } else if (updateAnswer.updateMode === 'add') {
                // Load existing entity and add to it
                this.entityConfig = existingEntity;
                this.entityName = existingEntity.name;
                this.isAdd = true;
                this.fieldCounter = this.entityConfig.fields.length;
                this.relationshipCounter = this.entityConfig.relationships.length;

                this._loadExistingEntities();
                this._loadExistingEnums();

                this._printEntitySummary();

                await this._askForFields();
                this._printEntitySummary();

                this.log(colors.cyan('\nAdding relationships to other entities\n'));
                await this._askForRelationships();
                this._printEntitySummary();

                return;
            } else if (updateAnswer.updateMode === 'remove') {
                // Load existing entity and allow removal
                this.entityConfig = existingEntity;
                this.entityName = existingEntity.name;
                this.isRemove = true;

                this._loadExistingEntities();
                this._loadExistingEnums();

                this._printEntitySummary();

                // Multi-select field removal
                if (this.entityConfig.fields.length > 0) {
                    const fieldsToRemove = await this.prompt([{
                        type: 'checkbox',
                        name: 'fields',
                        message: 'Please choose the fields you want to remove',
                        choices: this.entityConfig.fields.map(f => ({
                            name: f.name,
                            value: f.name
                        }))
                    }]);

                    if (fieldsToRemove.fields.length > 0) {
                        this.fieldsToRemove = this.entityConfig.fields.filter(
                            f => fieldsToRemove.fields.includes(f.name)
                        );
                        this.entityConfig.fields = this.entityConfig.fields.filter(
                            f => !fieldsToRemove.fields.includes(f.name)
                        );
                        this.log(colors.green(`Removed ${fieldsToRemove.fields.length} field(s)`));
                    }
                } else {
                    this.log(colors.yellow('No fields to remove'));
                }

                // Multi-select relationship removal
                if (this.entityConfig.relationships.length > 0) {
                    const relationshipsToRemove = await this.prompt([{
                        type: 'checkbox',
                        name: 'relationships',
                        message: 'Please choose the relationships you want to remove',
                        choices: this.entityConfig.relationships.map(r => ({
                            name: `${r.relationshipName}:${r.relationshipType}`,
                            value: r.relationshipName
                        }))
                    }]);

                    if (relationshipsToRemove.relationships.length > 0) {
                        this.relationshipsToRemove = this.entityConfig.relationships.filter(
                            r => relationshipsToRemove.relationships.includes(r.relationshipName)
                        )
                        this.entityConfig.relationships = this.entityConfig.relationships.filter(
                            r => !relationshipsToRemove.relationships.includes(r.relationshipName)
                        );
                        this.log(colors.green(`Removed ${relationshipsToRemove.relationships.length} relationship(s)`));
                    }
                } else {
                    this.log(colors.yellow('No relationships to remove'));
                }

                this._printEntitySummary();

                return;
            }
        }

        // Normal flow for new entity or regenerate

        const tableNameAnswer = await this.prompt([{
            type: 'input',
            name: 'tableName',
            message: 'Entity table name:',
            default: to.snake(pluralize(this.entityName)),
            validate: input => {
                if (input === '') {
                    return 'Table name cannot be empty';
                }
                if (!/^[a-z][a-z0-9_]*$/.test(input)) {
                    return `Your table name must start with a lower case letter and can only contain lowercase letters, numbers and underscores: /^[a-z][a-z0-9_]*$/`;
                }
                if (isReservedTableName(input)) {
                    return `'${input}' is a reserved word and cannot be used as a table name`;
                }
                return true
            }
        }]);

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
        this.entityConfig.tableName = tableNameAnswer.tableName;
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
        this.existingEntities = getEntitiesNames(this).filter(name => name !== 'AcRule');
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
                validate: input => {
                    if (input === '') {
                        return 'Your field name cannot be empty';
                    }
                    if (!/^[a-z][A-Za-z0-9]*$/.test(input)) {
                        return `Your field name must start with a lower case letter and cannot contain special characters: /^[a-z][A-Za-z0-9]*$/`;
                    }

                    const snakeCaseName = to.snake(input);

                    // Check against reserved field 'id' and existing fields
                    if (input === 'id' || this.entityConfig.fields.some(field => to.snake(field.name) === snakeCaseName)) {
                        return 'Your field name cannot use an already existing field name';
                    }

                    // Check against current entity's relationships
                    if (this.entityConfig.relationships.some(rel => to.snake(rel.relationshipName) === snakeCaseName)) {
                        return 'Your field name cannot use an already existing relationship name';
                    }

                    // Check against inverse relationships from other entities
                    if (getEntitiesRelationships(this)
                        .filter(rel => rel.otherEntityName === this.entityConfig.name)
                        .some(rel => to.snake(rel.otherEntityRelationshipName ?? '') === snakeCaseName)) {
                        return 'Your field name cannot use an already existing relationship name from other entities';
                    }

                    // Check against database/framework reserved words
                    if (isReservedWord(snakeCaseName)) {
                        return `'${input}' is a reserved word and cannot be used as a field name`;
                    }

                    return true;
                },
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

        if (this.isAdd) {
            this.fieldsToAdd.push(field);
        }

        this._printEntitySummary();

        await this._askForFields();
    }

    async _askForRelationships() {
        if (!this.existingEntities || this.existingEntities.length === 0) {
            return;
        }
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
                },
                validate: input => {
                    if (input === '') {
                        return 'Your relationship name cannot be empty';
                    }
                    if (!/^[a-z][A-Za-z0-9]*$/.test(input)) {
                        return `Your relationship name must start with a lower case letter and cannot contain special characters: /^[a-z][A-Za-z0-9]*$/`;
                    }

                    // console.log('Validating relationship name:', input);

                    const snakeCaseName = to.snake(input);

                    // Check against reserved field 'id' and existing fields
                    if (input === 'id' || this.entityConfig.fields.some(field => to.snake(field.name) === snakeCaseName)) {
                        return 'Your relationship name cannot use an already existing field name';
                    }

                    // Check against current entity's relationships
                    if (this.entityConfig.relationships.some(rel => to.snake(rel.relationshipName) === snakeCaseName)) {
                        return 'Your relationship name cannot use an already existing relationship name';
                    }

                    // Check against inverse relationships from other entities
                    if (getEntitiesRelationships(this)
                        .filter(rel => rel.otherEntityName === this.entityConfig.name)
                        .some(rel => to.snake(rel.otherEntityRelationshipName ?? '') === snakeCaseName)) {
                        return 'Your relationship name cannot use an already existing relationship name from other entities';
                    }

                    // Check against database/framework reserved words
                    if (isReservedWord(snakeCaseName)) {
                        return `'${input}' is a reserved word and cannot be used as a relationship name`;
                    }

                    console.log('VALID!');

                    return true;
                }
            }
        ]);

        const relationship = {
            entityName: this.entityName,
            owner: this.entityName,
            relationshipName: relationshipAnswers.relationshipName,
            otherEntityName: relationshipAnswers.otherEntity,
            relationshipType: relationshipAnswers.relationshipType,
            otherEntityField: undefined,
            relationshipRequired: undefined,
            bidirectional: undefined,
            otherEntityRelationshipName: undefined,
            inverseEntityField: undefined,
            inverseRelationshipRequired: undefined,
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
                },
                validate: input => {
                    const otherEntity = getEntity(this, relationshipAnswers.otherEntity);

                    if (input === '') {
                        return 'Your relationship name cannot be empty';
                    }
                    if (!/^[a-z][A-Za-z0-9]*$/.test(input)) {
                        return `Your relationship name must start with a lower case letter and cannot contain special characters: /^[a-z][A-Za-z0-9]*$/`;
                    }

                    const snakeCaseName = to.snake(input);

                    // Check against other entity's reserved field 'id' and existing fields
                    if (otherEntity && (input === 'id' || otherEntity.fields.some(field => to.snake(field.name) === snakeCaseName))) {
                        return 'Your relationship name cannot use an already existing field name in the other entity';
                    }

                    // Check against other entity's relationships
                    if (otherEntity && otherEntity.relationships.some(rel => to.snake(rel.relationshipName) === snakeCaseName)) {
                        return 'Your relationship name cannot use an already existing relationship name in the other entity';
                    }

                    // Check against inverse relationships pointing to the other entity
                    if (getEntitiesRelationships(this)
                        .filter(rel => rel.otherEntityName === relationshipAnswers.otherEntity)
                        .some(rel => to.snake(rel.otherEntityRelationshipName ?? '') === snakeCaseName)) {
                        return 'Your relationship name cannot use an already existing relationship name from other entities';
                    }

                    // Check against database/framework reserved words
                    if (isReservedWord(snakeCaseName)) {
                        return `'${input}' is a reserved word and cannot be used as a field/relationship name`;
                    }

                    return true;
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

        if (this.isAdd) {
            this.relationshipsToAdd.push(relationship);
        }

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
            maxlength: '100',
            pattern: `^[-A-Za-zÀ-ÖØ-öø-ÿ0-9 ']+$`,
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
        this.entityConfig.relationships.sort((a, b) => {
            // First compare entityName
            const entityNameCompare = a.entityName.localeCompare(b.entityName, undefined, { sensitivity: 'base' });
            if (entityNameCompare !== 0) return entityNameCompare;

            // If entityName is equal, compare otherEntityName
            const otherEntityNameCompare = a.otherEntityName.localeCompare(b.otherEntityName, undefined, { sensitivity: 'base' });
            if (otherEntityNameCompare !== 0) return otherEntityNameCompare;

            // If otherEntityName is also equal, compare relationshipType
            return a.relationshipType.localeCompare(b.relationshipType, undefined, { sensitivity: 'base' });
        });
        this.log(colors.green('\nEntity configuration completed'));
        const enums = getEnums(this);
        const storedEntities = (this.isRegenerate || this.isAdd || this.isRemove) ? replaceEntity(getEntities(this), this.entityConfig) : [...getEntities(this), this.entityConfig];
        const storedRelationships = (this.isRegenerate || this.isAdd || this.isRemove) ? replaceRelationships(getEntitiesRelationships(this), this.entityConfig) : [...getEntitiesRelationships(this), ...this.entityConfig.relationships];
        const searchEngine = this.config.get('searchEngine');

        // Save entity configuration to .pninja/<EntityName>.json
        const entityFilePath = this.destinationPath(`.pninja/${this.entityName}.json`);
        this.fs.writeJSON(entityFilePath, this.entityConfig, null, 2);

        this.log(colors.green(`Entity configuration saved to ${entityFilePath}`));

        const relationships = this.entityConfig.relationships || [];

        // Generate migrations
        if (!this.isRegenerate && !this.isAdd && !this.isRemove) {
            const migrationsGenerator = new MigrationsGenerator(this);
            migrationsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
            migrationsGenerator.createTable({ entity: this.entityConfig, enums });
            if (relationships.length > 0) {
                migrationsGenerator.createRelation({ entity: this.entityConfig, relationships });
                relationships.filter(rel => rel.relationshipType === 'one-to-many' || rel.relationshipType === 'one-to-one').map(rel => ({
                    name: rel.otherEntityName,
                    tableName: getEntityByName(this, rel.otherEntityName).tableName
                })).forEach(relEntity => {
                    migrationsGenerator.createRelation({ entity: relEntity, relationships })
                });
                migrationsGenerator.generatePivotMigrations(relationships);
            }
            this.log(colors.green('Migrations generated successfully\n'));
        }
        if (this.fieldsToAdd.length > 0) {
            const migrationsGenerator = new MigrationsGenerator(this);
            migrationsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
            migrationsGenerator.addColumns({
                entity: {
                    name: this.entityConfig.name,
                    tableName: this.entityConfig.tableName,
                    fields: this.fieldsToAdd
                },
                enums
            });
            this.log(colors.green('Field addition migrations generated successfully\n'));
        }
        if (this.fieldsToRemove.length > 0) {
            const migrationsGenerator = new MigrationsGenerator(this);
            migrationsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
            migrationsGenerator.removeColumns({
                entity: {
                    name: this.entityConfig.name,
                    tableName: this.entityConfig.tableName,
                    fields: this.fieldsToRemove
                },
                enums
            });
            this.log(colors.green('Field removal migrations generated successfully\n'));
        }
        if (this.relationshipsToAdd.length > 0) {
            const migrationsGenerator = new MigrationsGenerator(this);
            migrationsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
            migrationsGenerator.createRelation({
                entity: this.entityConfig,
                relationships: this.relationshipsToAdd.filter(rel => rel.relationshipType === 'one-to-one' || rel.relationshipType === 'many-to-one'),
            });
            this.relationshipsToAdd.filter(rel => rel.relationshipType === 'one-to-many').forEach(rel => {
                migrationsGenerator.createRelation({
                    entity: {
                        name: rel.otherEntityName,
                        tableName: getEntityByName(this, rel.otherEntityName).tableName
                    },
                    relationships: [rel],
                });
            });
            migrationsGenerator.createPivotMigrations(this.relationshipsToAdd.filter(rel => rel.relationshipType === 'many-to-many'));
        }
        if (this.relationshipsToRemove.length > 0) {
            const migrationsGenerator = new MigrationsGenerator(this);
            migrationsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
            migrationsGenerator.removeRelation({
                entity: this.entityConfig,
                relationships: this.relationshipsToRemove.filter(rel => rel.relationshipType === 'one-to-one' || rel.relationshipType === 'many-to-one'),
            });
            this.relationshipsToRemove.filter(rel => rel.relationshipType === 'one-to-many').forEach(rel => {
                migrationsGenerator.removeRelation({
                    entity: {
                        name: rel.otherEntityName,
                        tableName: getEntityByName(this, rel.otherEntityName).tableName
                    },
                    relationships: [rel],
                });
            });
            migrationsGenerator.removePivotMigrations(this.relationshipsToRemove.filter(rel => rel.relationshipType === 'many-to-many'));
        }

        // Generate models
        const modelsGenerator = new ModelsGenerator(this);
        modelsGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
        modelsGenerator.generateModel(this.entityConfig, enums, storedRelationships, searchEngine);

        [...relationships, ...this.relationshipsToRemove]
            .filter(rel => rel.bidirectional)
            .map(rel => rel.otherEntityName)
            .forEach(entityName => {
                const entity = getEntity(this, entityName);
                if (entity) {
                    modelsGenerator.generateModel(entity, enums, storedRelationships, searchEngine);
                }
            });
        this.log(colors.green('Models generated successfully\n'));

        // Generate controllers
        const controllersGenerator = new ControllersGenerator(this);
        controllersGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
        controllersGenerator.generateEntityController(this.entityConfig, storedRelationships, searchEngine);
        [...relationships, ...this.relationshipsToRemove]
            .filter(rel => rel.relationshipType === 'many-to-one' || rel.relationshipType === 'many-to-many')
            .map(rel => rel.otherEntityName)
            .forEach(entityName => {
                const relEntity = storedEntities.find(entity => entity.name === entityName);
                controllersGenerator.generateEntityController(relEntity, storedRelationships, searchEngine)
            });
        [...relationships, ...this.relationshipsToRemove]
            .filter(rel => rel.relationshipType === 'one-to-many' || rel.relationshipType === 'one-to-one')
            .map(rel => rel.otherEntityName)
            .forEach(entityName => {
                const relEntity = storedEntities.find(entity => entity.name === entityName);
                controllersGenerator.generateEntityController(relEntity, storedRelationships, searchEngine)
            });
        this.log(colors.green('Controllers generated successfully\n'));

        // Generate routes
        const routersGenerator = new RoutersGenerator(this);
        routersGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
        routersGenerator.generateRouters(storedEntities);
        this.log(colors.green('Routers generated successfully\n'));

        // Generate Factories and DatabaseSeeder
        const factoriesGenerator = new FactoriesGenerator(this);
        factoriesGenerator.that.sourceRoot(`${this.templatePath()}/../../entities/templates`);
        factoriesGenerator.generateFactories(this.config.get('howManyToGenerate') || 0, storedEntities, storedRelationships, enums);
        factoriesGenerator.that.fs.copyTpl(factoriesGenerator.that.templatePath("database/seeders/csv/AcRule.csv.ejs"), factoriesGenerator.that.destinationPath(`server/database/seeders/csv/AcRule.csv`), { entities: storedEntities });
        this.log(colors.green('Factories and DatabaseSeeder generated successfully\n'));

        // Generate client
        this.sourceRoot(`${this.templatePath()}/../../client/templates`);
        const appName = this.config.get('name');
        const nativeLanguage = this.config.get('nativeLanguage') || 'en';
        const languages = [nativeLanguage, ...this.config.get('languages')];
        if (this.config.get('clientType') === 'react') {
            // Copy locale files
            for (const lang of languages) {
                this.fs.copyTpl(this.templatePath(`react/public/locales/entities/entities.json.ejs`), this.destinationPath(`client/public/locales/${lang}/entities.json`), {
                    entities: [AcRule, ...storedEntities],
                    relationships: storedRelationships,
                    to,
                    pluralize,
                    getModelForeignIds,
                    getModelRelatedEntities
                });
            };
            // Update entity icons
            this.fs.copyTpl(this.templatePath("react/src/shared/entitiesIcons.tsx.ejs"), this.destinationPath(`client/src/shared/entitiesIcons.tsx`), { entities: storedEntities });

            // Update Menu
            this.fs.copyTpl(this.templatePath("react/src/components/Menu.tsx.ejs"), this.destinationPath(`client/src/components/Menu.tsx`), { appName, entities: storedEntities, to, pluralize, withLangSelect: languages.length > 1 });

            // Create entity pages
            createEntityPages({
                that: this,
                entity: this.entityConfig,
                enums: enums,
                relationships: storedRelationships,
                searchEngine: searchEngine
            });
            [...relationships, ...this.relationshipsToRemove]
                .filter(rel => (rel.relationshipType === 'one-to-many' && rel.bidirectional) || (rel.relationshipType === 'one-to-one' && rel.bidirectional))
                .map(rel => rel.otherEntityName)
                .forEach(entityName => {
                    const relEntity = storedEntities.find(entity => entity.name === entityName);
                    createEntityPages({
                        that: this,
                        entity: relEntity,
                        enums: enums,
                        relationships: storedRelationships,
                        searchEngine: searchEngine
                    });
                });
            [...relationships, ...this.relationshipsToRemove]
                .filter(rel => (rel.relationshipType === 'many-to-one' && rel.bidirectional) || (rel.relationshipType === 'many-to-many' && rel.bidirectional))
                .map(rel => rel.otherEntityName)
                .forEach(entityName => {
                    const relEntity = storedEntities.find(entity => entity.name === entityName);
                    createEntityPages({
                        that: this,
                        entity: relEntity,
                        enums: enums,
                        relationships: storedRelationships,
                        searchEngine: searchEngine
                    });
                });
            // Update App.tsx
            this.fs.copyTpl(this.templatePath("react/src/App.tsx.ejs"), this.destinationPath(`client/src/App.tsx`), { entities: [...storedEntities, AcRule], to, pluralize });
        }
    }
}