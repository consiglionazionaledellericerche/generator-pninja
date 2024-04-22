const { withCSV } = require('with-csv');
const to = require('to-case')
const pluralize = require('pluralize')

const createVueClient = async (that) => {
    const properties = await withCSV(that.destinationPath(`.presto-properties.csv`))
    .columns(["entity","column","type"])
    .rows();
    const entities = await withCSV(that.destinationPath(`.presto-entities.csv`))
    .columns(["name","class","table","variable","path"])
    .map(entity => {        
        entity._presto__properties = properties.filter((property) => property.entity === entity.name);
        return entity
    })
    .rows();
    that.fs.copyTpl(that.templatePath("vue/package.json"), that.destinationPath("client/package.json"));
    that.fs.copyTpl(that.templatePath("vue/package-lock.json"), that.destinationPath("client/package-lock.json"));
    that.fs.copyTpl(that.templatePath("vue/vite.config.ts.ejs"), that.destinationPath("client/vite.config.ts"));
    that.fs.copyTpl(that.templatePath("vue/tsconfig.app.json"), that.destinationPath("client/tsconfig.app.json"));
    that.fs.copyTpl(that.templatePath("vue/tsconfig.json"), that.destinationPath("client/tsconfig.json"));
    that.fs.copyTpl(that.templatePath("vue/tsconfig.app.json"), that.destinationPath("client/tsconfig.app.json"));
    that.fs.copyTpl(that.templatePath("vue/tsconfig.node.json"), that.destinationPath("client/tsconfig.node.json"));
    that.fs.copyTpl(that.templatePath("vue/.env.example"), that.destinationPath("client/.env.example"));
    that.fs.copyTpl(that.templatePath("vue/.eslintrc.cjs"), that.destinationPath("client/.eslintrc.cjs"));
    that.fs.copyTpl(that.templatePath("vue/.eslintrc.cjs"), that.destinationPath("client/.eslintrc.cjs"));
    that.fs.copyTpl(that.templatePath("vue/.gitignore"), that.destinationPath("client/.gitignore"));
    that.fs.copyTpl(that.templatePath("vue/.prettierrc.json"), that.destinationPath("client/.prettierrc.json"));
    that.fs.copyTpl(that.templatePath("vue/env.d.ts"), that.destinationPath("client/env.d.ts"));
    that.fs.copyTpl(that.templatePath("vue/index.html"), that.destinationPath("client/index.html"));

    that.fs.copyTpl(that.templatePath("vue/public/presto-p.svg"), that.destinationPath("client/public/presto-p.svg"));
    if(that.config.get('authentication') === 'keycloak') {
        that.fs.copyTpl(that.templatePath("vue/public/keycloak.json.example"), that.destinationPath("client/public/keycloak.json"));
    }

    that.fs.copyTpl(that.templatePath("vue/.vscode/extensions.json"), that.destinationPath("client/.vscode/extensions.json"));
    that.fs.copyTpl(that.templatePath("vue/.vscode/settings.json"), that.destinationPath("client/.vscode/settings.json"));

    that.fs.copyTpl(that.templatePath("vue/src/App.vue.ejs"), that.destinationPath("client/src/App.vue"));
    that.fs.copyTpl(that.templatePath("vue/src/main.ts"), that.destinationPath("client/src/main.ts"));
    
    that.fs.copyTpl(that.templatePath("vue/src/components/Home.vue"), that.destinationPath("client/src/components/Home.vue"));
    that.fs.copyTpl(that.templatePath("vue/src/components/NavBar.vue.ejs"), that.destinationPath("client/src/components/NavBar.vue"), { entities, pluralize });
    that.fs.copyTpl(that.templatePath("vue/src/components/TablePlaceholder.vue.ejs"), that.destinationPath("client/src/components/TablePlaceholder.vue"), { entities, pluralize });

    // ENTITIES COMPONENTS
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];        
        that.fs.copyTpl(
            that.templatePath("vue/src/components/entity/Entity.vue.ejs"),
            that.destinationPath(`client/src/components/entities/${entity.variable}/${entity.name}.vue`),
            {
                entity,
                pluralize
            }
        );
    }
    
    that.fs.copyTpl(that.templatePath("vue/src/plugins/authStore.js"), that.destinationPath("client/src/plugins/authStore.js"));
    that.fs.copyTpl(that.templatePath("vue/src/plugins/localeStore.js"), that.destinationPath("client/src/plugins/localeStore.js"));
    
    that.fs.copyTpl(that.templatePath("vue/src/router/index.js.ejs"), that.destinationPath("client/src/router/index.js"), { entities });
    
    that.fs.copyTpl(that.templatePath("vue/src/scss/styles.scss"), that.destinationPath("client/src/scss/styles.scss"));
    
    that.fs.copyTpl(that.templatePath("vue/src/services/api.ts"), that.destinationPath("client/src/services/api.ts"));
    that.fs.copyTpl(that.templatePath("vue/src/services/keycloak.js"), that.destinationPath("client/src/services/keycloak.js"));
    that.fs.copyTpl(that.templatePath("vue/src/services/tokenInterceptors.js"), that.destinationPath("client/src/services/tokenInterceptors.js"));
    
    that.fs.copyTpl(that.templatePath("vue/src/stores/authStore.js"), that.destinationPath("client/src/stores/authStore.js"));
    that.fs.copyTpl(that.templatePath("vue/src/stores/localeStore.js"), that.destinationPath("client/src/stores/localeStore.js"));

    that.fs.copyTpl(that.templatePath("vue/src/assets/pinia.svg"), that.destinationPath("client/src/assets/pinia.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/presto-p.svg"), that.destinationPath("client/src/assets/presto-p.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/vite.svg"), that.destinationPath("client/src/assets/vite.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/vue.svg"), that.destinationPath("client/src/assets/vue.svg"));

    that.fs.copyTpl(that.templatePath("vue/src/locales/en-EN.json.ejs"), that.destinationPath("client/src/locales/en-EN.json"), {appName: that.config.get('name'), entities, pluralize, to});
    that.fs.copyTpl(that.templatePath("vue/src/locales/it-IT.json.ejs"), that.destinationPath("client/src/locales/it-IT.json"), {appName: that.config.get('name'), entities, pluralize, to});
}
module.exports = { createVueClient }