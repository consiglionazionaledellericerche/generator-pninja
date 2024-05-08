const { withCSV } = require('with-csv');
const to = require('to-case')
const pluralize = require('pluralize')

const createVueClient = async (that) => {
    const properties = await withCSV(that.destinationPath(`.presto-properties.csv`))
        .columns(["entity", "column", "type"])
        .rows();
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
        .columns(["name", "class", "table", "variable", "path"])
        .map(entity => {
            entity._presto__properties = properties.filter((property) => property.entity === entity.name);
            return entity
        })
        .rows();
    that.fs.copyTpl(that.templatePath("vue/package.json.ejs"), that.destinationPath("client/package.json"));
    that.fs.copyTpl(that.templatePath("vue/package-lock.json.ejs"), that.destinationPath("client/package-lock.json"));
    that.fs.copyTpl(that.templatePath("vue/vite.config.ts.ejs"), that.destinationPath("client/vite.config.ts"));
    that.fs.copyTpl(that.templatePath("vue/tsconfig.json.ejs"), that.destinationPath("client/tsconfig.json"));
    that.fs.copyTpl(that.templatePath("vue/tsconfig.app.json.ejs"), that.destinationPath("client/tsconfig.app.json"));
    that.fs.copyTpl(that.templatePath("vue/tsconfig.node.json.ejs"), that.destinationPath("client/tsconfig.node.json"));
    that.fs.copyTpl(that.templatePath("vue/.env.example.ejs"), that.destinationPath("client/.env.example"));
    that.fs.copyTpl(that.templatePath("vue/.eslintrc.cjs.ejs"), that.destinationPath("client/.eslintrc.cjs"));
    that.fs.copyTpl(that.templatePath("vue/.gitignore.ejs"), that.destinationPath("client/.gitignore"));
    that.fs.copyTpl(that.templatePath("vue/.prettierrc.json.ejs"), that.destinationPath("client/.prettierrc.json"));
    that.fs.copyTpl(that.templatePath("vue/env.d.ts.ejs"), that.destinationPath("client/env.d.ts"));
    that.fs.copyTpl(that.templatePath("vue/index.html.ejs"), that.destinationPath("client/index.html"), { appName: that.config.get('name') });

    that.fs.copyTpl(that.templatePath("vue/public/presto-p.svg"), that.destinationPath("client/public/presto-p.svg"));
    if (that.config.get('authentication') === 'keycloak') {
        that.fs.copyTpl(that.templatePath("vue/public/keycloak.json.example.ejs"), that.destinationPath("client/public/keycloak.json"));
    }

    that.fs.copyTpl(that.templatePath("vue/.vscode/extensions.json.ejs"), that.destinationPath("client/.vscode/extensions.json"));
    that.fs.copyTpl(that.templatePath("vue/.vscode/settings.json.ejs"), that.destinationPath("client/.vscode/settings.json"));

    that.fs.copyTpl(that.templatePath("vue/src/App.vue.ejs"), that.destinationPath("client/src/App.vue"));
    that.fs.copyTpl(that.templatePath("vue/src/main.ts.ejs"), that.destinationPath("client/src/main.ts"));

    that.fs.copyTpl(that.templatePath("vue/src/components/ButtonActionConfirm.vue.ejs"), that.destinationPath("client/src/components/ButtonActionConfirm.vue"), { entities, pluralize });
    that.fs.copyTpl(that.templatePath("vue/src/components/CountDownCircle.vue.ejs"), that.destinationPath("client/src/components/CountDownCircle.vue"), { entities, pluralize });
    that.fs.copyTpl(that.templatePath("vue/src/components/HttpErrorInterceptor.vue.ejs"), that.destinationPath("client/src/components/HttpErrorInterceptor.vue"));
    that.fs.copyTpl(that.templatePath("vue/src/components/HomePage.vue.ejs"), that.destinationPath("client/src/components/HomePage.vue"));
    that.fs.copyTpl(that.templatePath("vue/src/components/NavBar.vue.ejs"), that.destinationPath("client/src/components/NavBar.vue"), { entities, pluralize });
    that.fs.copyTpl(that.templatePath("vue/src/components/TablePlaceholder.vue.ejs"), that.destinationPath("client/src/components/TablePlaceholder.vue"), { entities, pluralize });
    that.fs.copyTpl(that.templatePath("vue/src/components/ToastAlert.vue.ejs"), that.destinationPath("client/src/components/ToastAlert.vue"), { entities, pluralize });

    // ENTITIES COMPONENTS
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];
        that.fs.copyTpl(
            that.templatePath("vue/src/services/entities/entity.service.ts.ejs"),
            that.destinationPath(`client/src/services/entities/${entity.variable}.service.ts`),
            {
                entity,
                pluralize,
                to
            }
        );
        that.fs.copyTpl(
            that.templatePath("vue/src/components/entity/EntityComponent.vue.ejs"),
            that.destinationPath(`client/src/components/entities/${entity.variable}/${entity.name}Component.vue`),
            {
                entity,
                pluralize,
                to
            }
        );
        that.fs.copyTpl(
            that.templatePath("vue/src/components/entity/EntityDetailsComponent.vue.ejs"),
            that.destinationPath(`client/src/components/entities/${entity.variable}/${entity.name}DetailsComponent.vue`),
            {
                entity,
                pluralize
            }
        );
        that.fs.copyTpl(
            that.templatePath("vue/src/components/entity/EntityEditComponent.vue.ejs"),
            that.destinationPath(`client/src/components/entities/${entity.variable}/${entity.name}EditComponent.vue`),
            {
                entity,
                pluralize
            }
        );
        that.fs.copyTpl(
            that.templatePath("vue/src/models/entities/entity.model.ts.ejs"),
            that.destinationPath(`client/src/models/entities/${entity.variable}.model.ts`),
            {
                entity,
                pluralize
            }
        );
    }

    that.fs.copyTpl(that.templatePath("vue/src/models/toastError.model.ts.ejs"), that.destinationPath("client/src/models/toastError.model.ts"));

    that.fs.copyTpl(that.templatePath("vue/src/plugins/authStore.ts.ejs"), that.destinationPath("client/src/plugins/authStore.ts"));
    that.fs.copyTpl(that.templatePath("vue/src/plugins/localeStore.ts.ejs"), that.destinationPath("client/src/plugins/localeStore.ts"));

    that.fs.copyTpl(that.templatePath("vue/src/router/index.ts.ejs"), that.destinationPath("client/src/router/index.ts"), { entities });

    that.fs.copyTpl(that.templatePath("vue/src/scss/styles.scss"), that.destinationPath("client/src/scss/styles.scss"));

    that.fs.copyTpl(that.templatePath("vue/src/services/api.ts.ejs"), that.destinationPath("client/src/services/api.ts"));
    that.fs.copyTpl(that.templatePath("vue/src/services/keycloak.ts.ejs"), that.destinationPath("client/src/services/keycloak.ts"));
    that.fs.copyTpl(that.templatePath("vue/src/services/tokenInterceptors.ts.ejs"), that.destinationPath("client/src/services/tokenInterceptors.ts"));

    that.fs.copyTpl(that.templatePath("vue/src/stores/authStore.ts.ejs"), that.destinationPath("client/src/stores/authStore.ts"));
    that.fs.copyTpl(that.templatePath("vue/src/stores/localeStore.ts.ejs"), that.destinationPath("client/src/stores/localeStore.ts"));

    that.fs.copyTpl(that.templatePath("vue/src/assets/laravel-logo.svg"), that.destinationPath("client/src/assets/laravel-logo.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/mysql-logo.svg"), that.destinationPath("client/src/assets/mysql-logo.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/pgsql-logo.svg"), that.destinationPath("client/src/assets/pgsql-logo.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/pinia.svg"), that.destinationPath("client/src/assets/pinia.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/presto-p.svg"), that.destinationPath("client/src/assets/presto-p.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/sqlite-logo.svg"), that.destinationPath("client/src/assets/sqlite-logo.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/vite.svg"), that.destinationPath("client/src/assets/vite.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/vue.svg"), that.destinationPath("client/src/assets/vue.svg"));

    that.fs.copyTpl(that.templatePath("vue/src/locales/en-EN.json.ejs"), that.destinationPath("client/src/locales/en-EN.json"), { appName: that.config.get('name'), entities, pluralize, to });
    that.fs.copyTpl(that.templatePath("vue/src/locales/it-IT.json.ejs"), that.destinationPath("client/src/locales/it-IT.json"), { appName: that.config.get('name'), entities, pluralize, to });
}
module.exports = { createVueClient }