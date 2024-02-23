var Generator = require('yeoman-generator');
const fs = require('fs');
const to = require('to-case');
const colors = require('ansi-colors');
const moment = require('moment');

const getAddColumnUp = (name, type) => {
  switch (type.toLowerCase()) {
    case 'string':
      return `\n\t\t\t$table->string('${name}', 255);`
      break;
  
    default:
      return undefined;
      break;
  }
}
const getAddColumnDown = (name) => {
  return `\n\t\t\t$table->dropColumn('${name}');`
}

const getAddRelationUp = (relation) => {
  switch (relation.type.toLowerCase()) {
    case 'many-to-one':
      return `
\t\t\t$table->bigInteger('${relation.name}')->unsigned();
\t\t\t$table->foreign('${relation.name}')
\t\t\t      ->references('id')
\t\t\t      ->on('${to.snake(relation.to)}')
\t\t\t      ->onDelete('cascade');
      `
      break;
  
    default:
      return undefined;
      break;
  }
}
const getAddRelationDown = (relation) => {
  switch (relation.type.toLowerCase()) {
    case 'many-to-one':
      return `
\t\t\t$table->dropForeign(['${relation.name}']);
\t\t\t$table->dropColumn('${relation.name}');
      `
      break;
  
    default:
      return undefined;
      break;
  }
}

const getRelationPropertyOwner = (relation) => {
  switch (relation.type.toLowerCase()) {
    case 'many-to-one':
      return to.snake(relation.from)
      break;
  
    default:
      return undefined;
      break;
  }
}

module.exports = class extends Generator {
  async prompting() {
    let prompts = [];
    if(this.options["fromMain"]) {
      prompts = [...prompts, ...[{
        store: true,
        type: "confirm",
        name: "build",
        message: "Build all entities from entities definition file?",
        default: true
      }]]
    } else {
      prompts = [...prompts, ...[{
        type: "confirm",
        name: "rebuild",
        message: "Rebuild all entities?",
        default: false
      }]]
    }
    this.answers = await this.prompt(prompts);
    if(this.answers.build || this.answers.rebuild) {
      const answers = await this.prompt([{
        store: true,
        type: "input",
        name: "entitiesFilePath",
        message: "Entities definition file path",
        default: '.vamp.entities.json'
      }]);
      this.answers = {...this.answers, ...answers};
    }
  }
  
  writing() {
    this.log(colors.dim(JSON.stringify(this.answers)));
    if(!this.answers.build && !this.answers.rebuild) { return; }
    const entitiesFilePath = this.answers.entitiesFilePath[0] === '/' ? this.answers.entitiesFilePath : this.destinationPath(this.answers.entitiesFilePath);
    if(!this.fs.exists(entitiesFilePath)) {
      this.log(colors.red(`! Entities configuration file (${entitiesFilePath}) does not exists; no entities will be generated`));
      return
    } else {
      this.log(colors.green(`Entities configuration file found! Generating entities from ${entitiesFilePath}`));
    }
    const entities = this.fs.readJSON(entitiesFilePath) || {};
    if(Array.isArray(entities.entities)) {
      for (let index = 0; index < entities.entities.length; index++) {
        const {name, schema} = entities.entities[index];
        const ups = [];
        const downs = [];
        for(const col in schema) {
          ups.push(getAddColumnUp(col, schema[col]));
          downs.push(getAddColumnDown(col));
        }
        this.spawnCommandSync('php', ['artisan', 'make:migration', `create_${to.snake(name)}_table`], {cwd: 'server'});
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_columns_to_${to.snake(name)}_table.php`;
        this.fs.copyTpl(this.templatePath("make_migrations_update_table.php.ejs"), this.destinationPath(migrationFilePath),
        {
          tabName: to.snake(name),
          up: ups.join("\n"),
          down: downs.join("\n"),
        });
      }
    }
    if(Array.isArray(entities.relations)) {
      const ups = [];
      const downs = [];
      for (let index = 0; index < entities.relations.length; index++) {
        const relation = entities.relations[index];
        ups.push(getAddRelationUp(relation));
        downs.push(getAddRelationDown(relation));
        const migrationFilePath = `server/database/migrations/${moment().format("YYYY_MM_DD_HHmmss")}_add_relation_${to.snake(relation.name)}_${to.snake(relation.type)}_from_${to.snake(relation.from)}_to_${to.snake(relation.to)}.php`;
        this.fs.copyTpl(this.templatePath("make_migrations_update_table.php.ejs"), this.destinationPath(migrationFilePath),
        {
          tabName: getRelationPropertyOwner(relation),
          up: ups.join("\n"),
          down: downs.join("\n"),
        });
      }
    }
    // if(!this.fs.exists(entitiesFilePath)) {
    //   this.log(colors.red(`! Entities configuration file (${entitiesFilePath}) does not exists; no entities will be generated`))
    // } else {
    //   this.log(colors.green(`Entities configuration file found! Generating entities from ${entitiesFilePath}`));
    // }
    // const entities = this.fs.readJSON(entitiesFilePath) || [];
    // const entitiesPascalNames = entities.map(e => to.pascal(e.name));
    // entities.forEach(e => {
    //   let mongooseSchema = Object.assign({}, e.schema);
    //   Object.keys(mongooseSchema).map(function(key) {
    //     mongooseSchema[key] = mongooseSchema[key] === "Datetime" ? "Date" : mongooseSchema[key];
    //   });
    //   const pascalName = to.pascal(e.name);
    //   const columns = (Object.entries(e.schema)).map(e => ({
    //     title: to.title(e[0]),
    //     field: e[0],
    //     type: e[1].toLowerCase().replace(/^number$/, "numeric")
    //   }));
    //   this.fs.copyTpl(
    //       this.templatePath("server/entities/entity.model.js.ejs"),
    //       this.destinationPath(`server/entities/${pascalName}/${pascalName}.model.js`),
    //       {
    //         entitySchemaName: pascalName,
    //         entitySchema: JSON.stringify(mongooseSchema, null, 4)
    //       }
    //   );
    //   this.fs.copyTpl(
    //       this.templatePath("server/entities/entity.routes.js.ejs"),
    //       this.destinationPath(`server/entities/${pascalName}/${pascalName}.routes.js`),
    //       {
    //         entitySchemaName: pascalName
    //       }
    //   );
    //   this.fs.copyTpl(
    //       this.templatePath("client/src/Entities/Items.js.ejs"),
    //       this.destinationPath(`client/src/Entities/${pascalName}.js`),
    //       {
    //         componentName: pascalName,
    //         componentTitle: to.title(pascalName),
    //         componentApiPath: to.slug(pascalName),
    //         componentColumns: columns
    //       }
    //   );
    // });
    // this.fs.copyTpl(this.templatePath("server/entities/entities.js.ejs"), this.destinationPath("server/entities/entities.js"), { to: to, entities: entitiesPascalNames});
    // this.fs.copyTpl(this.templatePath("client/src/EntitiesRoutes.js.ejs"), this.destinationPath("client/src/EntitiesRoutes.js"), {
    //   entities: entities.map(e => ({
    //     path: to.slug(e.name),
    //     componentName: to.pascal(e.name)
    //   }))
    // });
    // this.fs.copyTpl(this.templatePath("client/src/EntitiesNavigation.js.ejs"), this.destinationPath("client/src/EntitiesNavigation.js"), {
    //   entities: entities.map(e => ({
    //     path: to.slug(e.name),
    //     name: to.title(e.name)
    //   }))
    // });
  }
  end() {
    this.spawnCommandSync('php', ['artisan', 'migrate'], {cwd: 'server'});
  }
};
