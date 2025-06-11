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
            const params = entity.body.filter(c => c.type !== 'Blob' && c.type !== 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}' => ${this._getFakerRule(prop)},`);
            // const params = [
            //     ...entity.body.filter(c => c.type !== 'Blob' && c.type !== 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}' => ${this._getFakerRule(prop)},`),
            //     ...[
            //         entity.body.filter(c => c.type == 'Blob').map(prop => `${tab(3)}'${to.snake(prop.name)}_path' => 'uploads/0000/00/00/dummy.pdf',`),
            //         entity.body.filter(c => c.type == 'Blob').map(prop => `${tab(3)}'${to.snake(prop.name)}_type' => 'application/pdf',`),
            //         entity.body.filter(c => c.type == 'Blob').map(prop => `${tab(3)}'${to.snake(prop.name)}_name' => 'dummy.pdf',`),
            //     ],
            //     ...[
            //         entity.body.filter(c => c.type == 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}_path' => 'uploads/0000/00/00/image_placeholder.png',`),
            //         entity.body.filter(c => c.type == 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}_type' => 'image/png',`),
            //         entity.body.filter(c => c.type == 'ImageBlob').map(prop => `${tab(3)}'${to.snake(prop.name)}_name' => 'image_placeholder.png',`),
            //     ]
            // ];

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
        const hasUnique = field.fieldValidateRules && field.fieldValidateRules.includes('unique');

        switch (field.type) {
            case 'String':
                if (field.name.toLowerCase().includes('email')) {
                    return 'fake()->unique()->safeEmail()';
                } else if (to.snake(field.name).includes('first_name')) {
                    return hasUnique ? 'fake()->unique()->firstNameMale()' : 'fake()->firstNameMale()';
                } else if (to.snake(field.name).includes('last_name')) {
                    return hasUnique ? 'fake()->unique()->lastName()' : 'fake()->lastName()';
                } else if (field.name.toLowerCase().includes('phone')) {
                    return hasUnique ? 'fake()->unique()->phoneNumber()' : 'fake()->phoneNumber()';
                } else if (field.name.toLowerCase().includes('address')) {
                    return 'fake()->address()';
                } else if (field.name.toLowerCase().includes('code')) {
                    return hasUnique ? 'fake()->unique()->bothify("??##??##")' : 'fake()->bothify("??##??##")';
                } else {
                    return hasUnique ? `fake()->unique()->regexify('[A-Z][a-z]{7}')` : `fake()->regexify('[A-Z][a-z]{7}')`;
                }
            case 'Integer':
                if (field.fieldValidateRules) {
                    const min = field.fieldValidateRules.includes('min') ? field.fieldValidateRulesMin : 1;
                    const max = field.fieldValidateRules.includes('max') ? field.fieldValidateRulesMax : 100;
                    return `fake()->numberBetween(${min}, ${max})`;
                }
                return 'fake()->numberBetween(1, 100)';
            case 'Long':
                return 'fake()->numberBetween(1, 1000000)';
            case 'Float':
            case 'Double':
            case 'BigDecimal':
                return 'fake()->randomFloat(2, 0, 10000)';
            case 'Boolean':
                return 'fake()->boolean()';
            case 'LocalDate':
            case 'Date':
                return 'fake()->dateTimeBetween("-1 year", "now")';
            case 'ZonedDateTime':
            case 'Instant':
                return 'fake()->dateTimeBetween("-1 year", "now")';
            case 'LocalTime':
                return 'fake()->time()';
            case 'Duration':
                return 'fake()->numberBetween(1, 1000000)';
            // case 'byte[]':
            // case 'ByteBuffer':
            //     return 'fake()->sha256()';
            case 'TextBlob':
                return 'fake()->text()';
            case 'UUID':
                return 'fake()->uuid()';
            default:
                if (enums.filter(e => field.type === e.name).map(e => e.name).pop()) {
                    return `((\\App\\Enums\\${enums.filter(e => field.type === e.name).map(e => e.name).pop()}::cases())[array_rand(\\App\\Enums\\${enums.filter(e => field.type === e.name).map(e => e.name).pop()}::cases())])->value`
                }
                return `fake()->regexify('[A-Z][a-z]{7}')`;
        }
    }
}