import to from 'to-case';
import { AcRule } from '../../utils/AcRule.js';
import { getEntities, getEntitiesRelationships, getEnums } from '../../utils/entities-utils.js';
const tab = (n = 1) => (Array(n)).fill('    ').join('');

export class FactoriesGenerator {
    constructor(that) {
        this.that = that;
    }

    generateFactories(n = 5, entities = null, relationships = null, enums = null) {
        entities = entities ?? getEntities(this.that);
        relationships = relationships ?? getEntitiesRelationships(this.that);
        enums = enums ?? getEnums(this.that);
        let manyToMany = [];
        for (const entity of entities) {
            const models = [`use App\\Models\\${entity.name};`];
            const params = entity.fields.filter(c => c.type !== 'Blob' && c.type !== 'AnyBlob' && c.type !== 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}' => ${this._getFakerRule(prop, enums)},`);
            const paramsBlobBlob = entity.fields.filter(c => ['Blob', 'AnyBlob'].includes(c.type)).map(prop => `${tab(3)}'${to.snake(prop.name)}_blob' => file_get_contents(__DIR__ . '/dummy.pdf'),`);
            const paramsBlobType = entity.fields.filter(c => ['Blob', 'AnyBlob'].includes(c.type)).map(prop => `${tab(3)}'${to.snake(prop.name)}_type' => 'application/pdf',`);
            const paramsBlobName = entity.fields.filter(c => ['Blob', 'AnyBlob'].includes(c.type)).map(prop => `${tab(3)}'${to.snake(prop.name)}_name' => fake()->unique()->regexify('[a-z]{8}') . "_dummy.pdf",`);
            const paramsImageBlob = entity.fields.filter(c => c.type === 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}_blob' => file_get_contents(__DIR__ . '/dummy.png'),`);
            const paramsImageType = entity.fields.filter(c => c.type === 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}_type' => 'image/png',`);
            const paramsImageName = entity.fields.filter(c => c.type === 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}_name' => fake()->unique()->regexify('[a-z]{8}') . "_dummy.png",`);
            params.push(...([...paramsBlobBlob, ...paramsBlobType, ...paramsBlobName, ...paramsImageBlob, ...paramsImageType, ...paramsImageName].sort()));

            // Relationships one-to-one
            relationships.filter(relation => (
                relation.relationshipType === 'one-to-one'
                && relation.entityName === entity.name
            )).forEach(relation => {
                if (relation.entityName !== relation.otherEntityName) {
                    models.push(`use App\\Models\\${relation.otherEntityName};`)
                }
                params.push(`${tab(3)}'${to.snake(relation.relationshipName || relation.otherEntityName)}_id' => function() {
                    if (${relation.otherEntityName}::count() === 0) {
                        ${relation.entityName !== relation.otherEntityName ? `while(${relation.otherEntityName}::count() < ${n}) ${relation.otherEntityName}::factory()->create()` : `return null`};
                    }
                    $ids${relation.otherEntityName} = array_map(function($e) { return $e['id']; }, (${relation.otherEntityName}::all(['id']))->toArray());
                    $ids${entity.name} = array_map(function($e) { return $e['${to.snake(relation.relationshipName || relation.otherEntityName)}_id']; }, (${entity.name}::all(['${to.snake(relation.relationshipName || relation.otherEntityName)}_id']))->toArray());
                    return $this->getRandomUniqueValue($ids${relation.otherEntityName}, $ids${entity.name});
                },`);
            });
            // Relationships one-to-many
            relationships.filter(relation => (
                relation.relationshipType === 'one-to-many'
                && relation.otherEntityName === entity.name
                && relation.entityName !== relation.otherEntityName
            )).forEach(relation => {
                if (relation.entityName !== relation.otherEntityName) {
                    models.push(`use App\\Models\\${relation.entityName};`)
                }
                params.push(`${tab(3)}'${to.snake(relation.otherEntityRelationshipName || relation.entityName)}_id' => function() {
                    if (${relation.entityName}::count() === 0) {
                        ${relation.entityName !== relation.otherEntityName ? `while(${relation.entityName}::count() < ${n}) ${relation.entityName}::factory()->create()` : `return null`};
                    }
                    $ids${relation.entityName} = array_map(function($e) { return $e['id']; }, (${relation.entityName}::all(['id']))->toArray());
                    return ((new \\Random\\Randomizer())->shuffleArray($ids${relation.entityName}))[0];
                },`);
            });
            // Relationships many-to-one
            relationships.filter(relation => (
                relation.relationshipType === 'many-to-one'
                && relation.entityName === entity.name
            )).forEach(relation => {
                if (relation.entityName !== relation.otherEntityName) {
                    models.push(`use App\\Models\\${relation.otherEntityName};`)
                }
                params.push(`${tab(3)}'${to.snake(relation.relationshipName || relation.otherEntityName)}_id' => function() {
                    if (${relation.otherEntityName}::count() === 0) {
                        ${relation.entityName !== relation.otherEntityName ? `while(${relation.otherEntityName}::count() < ${n}) ${relation.otherEntityName}::factory()->create()` : `return null`};
                    }
                    $ids${relation.otherEntityName} = array_map(function($e) { return $e['id']; }, (${relation.otherEntityName}::all(['id']))->toArray());
                    return ((new \\Random\\Randomizer())->shuffleArray($ids${relation.otherEntityName}))[0];
                },`);
            });
            this.that.fs.copyTpl(this.that.templatePath("EntityFactory.php.ejs"), this.that.destinationPath(`server/database/factories/${entity.name}Factory.php`),
                {
                    entityName: entity.name,
                    models: models.reduce((acc, curr) => acc.includes(curr) ? acc : [...acc, curr], []).join("\n"),
                    params: params.join("\n"),
                });
            // Relationships many-to-many
            relationships.filter(relation => (
                relation.relationshipType === 'many-to-many'
                && relation.entityName === entity.name
            )).forEach(relation => {
                if (entity.name === relation.owner) {
                    manyToMany.push({
                        fromEntity: relation.entityName,
                        toEntity: relation.otherEntityName,
                        relPropery: to.snake(relation.relationshipName || relation.otherEntityName)
                    });
                } else {
                    manyToMany.push({
                        fromEntity: relation.owner,
                        toEntity: relation.entityName,
                        relPropery: relation.otherEntityRelationshipName
                    });
                }
            });
        }
        this.that.fs.copyTpl(this.that.templatePath("DatabaseSeeder.php.ejs"), this.that.destinationPath(`server/database/seeders/DatabaseSeeder.php`),
            {
                entities: [AcRule, ...entities],
                manyToMany,
                n,
            });
    }

    _getFakerRule(field, enums) {
        const { validations, name } = field;

        const min = Number(validations.reduce((min, validation) => validation.key === 'min' ? validation.value : min, undefined));
        const max = Number(validations.reduce((max, validation) => validation.key === 'max' ? validation.value : max, undefined));
        const minlength = Number(validations.reduce((minlength, validation) => validation.key === 'minlength' ? validation.value : minlength, undefined));
        const maxlength = Number(validations.reduce((maxlength, validation) => validation.key === 'maxlength' ? validation.value : maxlength, undefined));
        const minbytes = Number(validations.reduce((minbytes, validation) => validation.key === 'minbytes' ? validation.value : minbytes, undefined));
        const maxbytes = Number(validations.reduce((maxbytes, validation) => validation.key === 'maxbytes' ? validation.value : maxbytes, undefined));
        const pattern = validations.reduce((pattern, validation) => validation.key === 'pattern' ? validation.value : pattern, undefined);
        const isEmail = name.toLowerCase().includes('email');
        const isUrl = name.toLowerCase().includes('url');
        const isUnique = field?.validations?.includes('unique');
        const isRequired = validations.reduce((required, validation) => required || validation.key === 'required', false);

        switch (field.type) {
            case 'String':
                if (pattern) {
                    return `fake()->unique()->regexify('${pattern.replace(/'/g, "\\'")}')`;
                } else if (isEmail) {
                    return `substr(str_pad(fake()->unique()->safeEmail(), ${minlength || 0}, 'x', STR_PAD_LEFT), 0, ${maxlength || 255})`;
                } else if (isUrl) {
                    return `substr(str_pad(fake()->unique()->url(), ${minlength || 0}, 'x', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else if (to.snake(field.name).includes('first_name')) {
                    return `substr(str_pad(fake()->unique()->firstNameMale(), ${minlength || 0}, 'x', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else if (to.snake(field.name).includes('last_name')) {
                    return `substr(str_pad(fake()->unique()->lastName(), ${minlength || 0}, 'x', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else if (to.snake(field.name).includes('name')) {
                    return `substr(str_pad(fake()->unique()->name(), ${minlength || 0}, 'x', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else if (to.snake(field.name).includes('password')) {
                    return `fake()->unique()->password(${minlength || 16}, ${maxlength || 32})`;
                } else if (field.name.toLowerCase().includes('phone')) {
                    return `substr(str_pad(fake()->unique()->phoneNumber(), ${minlength || 0}, '0', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else if (field.name.toLowerCase().includes('address')) {
                    return `substr(str_pad(fake()->unique()->address(), ${minlength || 0}, 'x', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else if (field.name.toLowerCase().includes('code')) {
                    return `substr(str_pad(fake()->unique()->bothify("??##??##"), ${minlength || 0}, '??##', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else {
                    return `substr(fake()->unique()->regexify('[A-Z][a-z]{${(minlength || 7) >= 7 ? minlength || 7 : 7}}'), 0, ${maxlength || 255})`;
                }
            case 'Integer':
                return `fake()->numberBetween(${min || 1}, ${max || 100})`;
            case 'Long':
                return `fake()->numberBetween(${min || 1}, ${max || 1000000})`;
            case 'Float':
            case 'Double':
            case 'BigDecimal':
                return `fake()->randomFloat(2, ${min || 0}, ${max || 10000})`;
            case 'Boolean':
                return `${isRequired ? 'true' : 'fake()->boolean()'}`;
            case 'LocalDate':
            case 'Date':
                return 'fake()->dateTimeBetween("-1 year", "now")->format("Y-m-d")';
            case 'ZonedDateTime':
            case 'Instant':
                return 'fake()->dateTimeBetween("-1 year", "now")->format("Y-m-d H:i:s")';
            case 'LocalTime':
                return 'fake()->time()';
            case 'Duration':
                return `fake()->numberBetween(${min || 86400}, ${max || 8855999}) * 1000`;
            case 'TextBlob':
                return 'fake()->text()';
            case 'UUID':
                return '\\Illuminate\\Support\\Str::uuid()->toString()';
            default:
                if (enums.filter(e => field.type === e.name).map(e => e.name).pop()) {
                    return `((\\App\\Enums\\${enums.filter(e => field.type === e.name).map(e => e.name).pop()}::cases())[array_rand(\\App\\Enums\\${enums.filter(e => field.type === e.name).map(e => e.name).pop()}::cases())])->value`
                }
                return `fake()->regexify('[A-Z][a-z]{7}')`;
        }
    }
}