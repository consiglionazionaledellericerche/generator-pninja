// generators/entity/index.js
import Generator from 'yeoman-generator';
import colors from 'ansi-colors';

export default class extends Generator {
    constructor(args, opts) {
        super(args, opts);

        this.argument('entityName', {
            type: String,
            required: false,
            description: 'Entity name'
        });

        this.entityConfig = {
            fields: [],
            relationships: []
        };
    }

    async prompting() {
        this.log(colors.blue('\nGenerating a new entity\n'));

        // Chiedi il nome se non passato come argomento
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

        // Soft delete
        const softDeleteAnswer = await this.prompt([{
            type: 'confirm',
            name: 'softDelete',
            message: 'Do you want to enable soft delete?',
            default: true
        }]);

        this.entityConfig.name = this.entityName;
        this.entityConfig.softDelete = softDeleteAnswer.softDelete;

        // Carica entità esistenti per le relazioni
        this._loadExistingEntities();

        // Loop campi
        await this._askForFields();

        // Loop relazioni
        await this._askForRelationships();
    }

    _loadExistingEntities() {
        const entitiesPath = this.destinationPath('.pninja/Entities.json');
        this.existingEntities = [];

        if (this.fs.exists(entitiesPath)) {
            const entitiesData = this.fs.readJSON(entitiesPath);
            this.existingEntities = entitiesData.entities.map(e => e.name);
        }

        // Add current entity to the list for relationships
        this.existingEntities.push(this.entityName);
    }

    async _askForFields() {
        const addFieldAnswer = await this.prompt([{
            type: 'confirm',
            name: 'addField',
            message: 'Do you want to add a field to your entity?',
            default: true
        }]);

        if (!addFieldAnswer.addField) {
            return;
        }

        // Chiedi info campo
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
                    'TextBlob'
                ]
            },
            {
                type: 'confirm',
                name: 'addValidation',
                message: 'Do you want to add validation rules to your field?',
                default: false
            }
        ]);

        const field = {
            fieldName: fieldAnswers.fieldName,
            fieldType: fieldAnswers.fieldType,
            fieldValidateRules: []
        };

        // Se vuole validazioni
        if (fieldAnswers.addValidation) {
            const validationAnswer = await this.prompt([{
                type: 'checkbox',
                name: 'validationRules',
                message: 'Which validation rules would you like to add?',
                choices: this._getValidationChoices(fieldAnswers.fieldType)
            }]);

            field.fieldValidateRules = validationAnswer.validationRules;

            // Chiedi i valori per le validazioni che ne richiedono
            for (const rule of validationAnswer.validationRules) {
                if (['minlength', 'maxlength', 'min', 'max', 'minbytes', 'maxbytes', 'pattern'].includes(rule)) {
                    const valueAnswer = await this.prompt([{
                        type: 'input',
                        name: 'value',
                        message: `What is the ${rule} value?`,
                        default: this._getValidationDefault(rule)
                    }]);
                    field[`fieldValidate${rule.charAt(0).toUpperCase() + rule.slice(1)}`] = valueAnswer.value;
                }
            }
        }

        this.entityConfig.fields.push(field);

        // Ricorsione per aggiungere altri campi
        await this._askForFields();
    }

    async _askForRelationships() {
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
                type: 'input',
                name: 'relationshipName',
                message: 'What is the name of the relationship?',
                default: answers => answers.otherEntity.charAt(0).toLowerCase() + answers.otherEntity.slice(1)
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
                type: 'confirm',
                name: 'bidirectional',
                message: 'Do you want to generate a bidirectional relationship?',
                default: true
            }
        ]);

        const relationship = {
            relationshipName: relationshipAnswers.relationshipName,
            otherEntityName: relationshipAnswers.otherEntity,
            relationshipType: relationshipAnswers.relationshipType,
            bidirectional: relationshipAnswers.bidirectional
        };

        if (relationshipAnswers.bidirectional) {
            const bidirectionalAnswers = await this.prompt([{
                type: 'input',
                name: 'otherEntityRelationshipName',
                message: 'What is the name of this relationship in the other entity?',
                default: this.entityName.charAt(0).toLowerCase() + this.entityName.slice(1)
            }]);
            relationship.otherEntityRelationshipName = bidirectionalAnswers.otherEntityRelationshipName;
        }

        // Recupera i campi dell'entità correlata
        const otherEntityFields = this._getEntityFields(relationshipAnswers.otherEntity);

        const displayFieldAnswer = await this.prompt([{
            type: 'list',
            name: 'otherEntityField',
            message: `When you display this relationship on client-side, which field from '${relationshipAnswers.otherEntity}' do you want to use?`,
            choices: otherEntityFields,
            default: 'id'
        }]);
        relationship.otherEntityField = displayFieldAnswer.otherEntityField;

        const validationAnswer = await this.prompt([{
            type: 'confirm',
            name: 'relationshipValidation',
            message: 'Do you want to add any validation rules to this relationship?',
            default: false
        }]);

        if (validationAnswer.relationshipValidation) {
            const rulesAnswer = await this.prompt([{
                type: 'checkbox',
                name: 'validationRules',
                message: 'Which validation rules?',
                choices: [
                    { name: 'Required', value: 'required' }
                ]
            }]);
            relationship.relationshipValidateRules = rulesAnswer.validationRules;
        }

        this.entityConfig.relationships.push(relationship);

        // Ricorsione per aggiungere altre relazioni
        await this._askForRelationships();
    }

    _getEntityFields(entityName) {
        // Se è l'entità corrente, usa i campi già definiti
        if (entityName === this.entityName) {
            const fields = this.entityConfig.fields
                .filter(f => !f.fieldType.includes('Blob'))
                .map(f => f.fieldName);

            return ['id', ...fields];
        }

        // Altrimenti cerca nell'Entities.json
        const entitiesPath = this.destinationPath('.pninja/Entities.json');

        if (!this.fs.exists(entitiesPath)) {
            return ['id'];
        }

        const entitiesData = this.fs.readJSON(entitiesPath);
        const entity = entitiesData.entities.find(e => e.name === entityName);

        if (!entity || !entity.body) {
            return ['id'];
        }

        const fields = entity.body
            .filter(f => !f.type.includes('Blob'))
            .map(f => f.name);

        return ['id', ...fields];
    }

    _getValidationChoices(fieldType) {
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

    configuring() {
        this.log(colors.green('\nEntity configuration completed'));
        this.log(JSON.stringify(this.entityConfig, null, 2));
    }
}