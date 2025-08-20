import to from 'to-case';
import { parseJDL } from '../../utils/jdlParser.js';
const tab = (n = 1) => (Array(n)).fill('    ').join('');


export class FactoriesGenerator {
    constructor(that, entitiesFilePath) {
        this.that = that;
        this.entitiesFilePath = entitiesFilePath;
        this.parsedJDL = parseJDL(this.entitiesFilePath);
    }

    generateFactories(n = 5) {
        const { enums, entities, relationships } = this.parsedJDL;
        let manyToMany = [];
        for (const entity of entities) {
            const models = [`use App\\Models\\${entity.name};`];
            const params = entity.body.filter(c => c.type !== 'Blob' && c.type !== 'AnyBlob' && c.type !== 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}' => ${this._getFakerRule(prop)},`);

            // Relationships OneToOne
            relationships.filter(relation => (
                relation.cardinality === 'OneToOne'
                && relation.from.name === entity.name
            )).forEach(relation => {
                if (relation.from.name !== relation.to.name) {
                    models.push(`use App\\Models\\${relation.to.name};`)
                }
                params.push(`${tab(3)}'${to.snake(relation.from.injectedField || relation.to.name)}_id' => function() {
                    if (${relation.to.name}::count() === 0) {
                        ${relation.from.name !== relation.to.name ? `while(${relation.to.name}::count() < ${n}) ${relation.to.name}::factory()->create()` : `return null`};
                    }
                    $ids${relation.to.name} = array_map(function($e) { return $e['id']; }, (${relation.to.name}::all(['id']))->toArray());
                    $ids${entity.name} = array_map(function($e) { return $e['${to.snake(relation.from.injectedField || relation.to.name)}_id']; }, (${entity.name}::all(['${to.snake(relation.from.injectedField || relation.to.name)}_id']))->toArray());
                    return $this->getRandomUniqueValue($ids${relation.to.name}, $ids${entity.name});
                },`);
            });
            // Relationships OneToMany
            relationships.filter(relation => (
                relation.cardinality === 'OneToMany'
                && relation.to.name === entity.name
                && relation.from.name !== relation.to.name
            )).forEach(relation => {
                if (relation.from.name !== relation.to.name) {
                    models.push(`use App\\Models\\${relation.from.name};`)
                }
                params.push(`${tab(3)}'${to.snake(relation.to.injectedField || relation.from.name)}_id' => function() {
                    if (${relation.from.name}::count() === 0) {
                        ${relation.from.name !== relation.to.name ? `while(${relation.from.name}::count() < ${n}) ${relation.from.name}::factory()->create()` : `return null`};
                    }
                    $ids${relation.from.name} = array_map(function($e) { return $e['id']; }, (${relation.from.name}::all(['id']))->toArray());
                    return ((new \\Random\\Randomizer())->shuffleArray($ids${relation.from.name}))[0];
                },`);
            });
            // Relationships ManyToOne
            relationships.filter(relation => (
                relation.cardinality === 'ManyToOne'
                && relation.from.name === entity.name
            )).forEach(relation => {
                if (relation.from.name !== relation.to.name) {
                    models.push(`use App\\Models\\${relation.to.name};`)
                }
                params.push(`${tab(3)}'${to.snake(relation.from.injectedField || relation.to.name)}_id' => function() {
                    if (${relation.to.name}::count() === 0) {
                        ${relation.from.name !== relation.to.name ? `while(${relation.to.name}::count() < ${n}) ${relation.to.name}::factory()->create()` : `return null`};
                    }
                    $ids${relation.to.name} = array_map(function($e) { return $e['id']; }, (${relation.to.name}::all(['id']))->toArray());
                    return ((new \\Random\\Randomizer())->shuffleArray($ids${relation.to.name}))[0];
                },`);
            });
            this.that.fs.copyTpl(this.that.templatePath("EntityFactory.php.ejs"), this.that.destinationPath(`server/database/factories/${entity.name}Factory.php`),
                {
                    entityName: entity.name,
                    models: models.reduce((acc, curr) => acc.includes(curr) ? acc : [...acc, curr], []).join("\n"),
                    params: params.join("\n"),
                });
            // Relationships ManyToMany
            relationships.filter(relation => (
                relation.cardinality === 'ManyToMany'
                && relation.from.name === entity.name
            )).forEach(relation => {
                manyToMany.push({
                    fromEntity: relation.from.name,
                    toEntity: relation.to.name,
                    relPropery: to.snake(relation.from.injectedField || relation.to.name)
                });
            });
        }
        this.that.fs.copyTpl(this.that.templatePath("DatabaseSeeder.php.ejs"), this.that.destinationPath(`server/database/seeders/DatabaseSeeder.php`),
            {
                entities,
                manyToMany,
                n,
            });
    }

    _getFakerRule(field) {
        const { enums } = this.parsedJDL;
        const { validations, name } = field;

        const min = Number(validations.reduce((min, validation) => validation.key === 'min' ? validation.value : min, undefined));
        const max = Number(validations.reduce((max, validation) => validation.key === 'max' ? validation.value : max, undefined));
        const minlength = Number(validations.reduce((minlength, validation) => validation.key === 'minlength' ? validation.value : minlength, undefined));
        const maxlength = Number(validations.reduce((maxlength, validation) => validation.key === 'maxlength' ? validation.value : maxlength, undefined));
        const minbytes = Number(validations.reduce((minbytes, validation) => validation.key === 'minbytes' ? validation.value : minbytes, undefined));
        const maxbytes = Number(validations.reduce((maxbytes, validation) => validation.key === 'maxbytes' ? validation.value : maxbytes, undefined));
        const pattern = Number(validations.reduce((pattern, validation) => validation.key === 'pattern' ? validation.value : pattern, undefined));
        const isEmail = name.toLowerCase().includes('email');
        const isUnique = field?.validations?.includes('unique');
        const isRequired = validations.reduce((required, validation) => required || validation.key === 'required', false);

        switch (field.type) {
            case 'String':
                if (isEmail) {
                    return `substr(str_pad(fake()->unique()->safeEmail(), ${minlength || 0}, 'x', STR_PAD_LEFT), 0, ${maxlength || 255})`;
                } else if (to.snake(field.name).includes('first_name')) {
                    return `substr(str_pad(fake()->unique()->firstNameMale(), ${minlength || 0}, 'x', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
                } else if (to.snake(field.name).includes('last_name')) {
                    return `substr(str_pad(fake()->unique()->lastName(), ${minlength || 0}, 'x', STR_PAD_RIGHT), 0, ${maxlength || 255})`;
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
                return 'fake()->dateTimeBetween("-1 year", "now")';
            case 'ZonedDateTime':
            case 'Instant':
                return 'fake()->dateTimeBetween("-1 year", "now")';
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