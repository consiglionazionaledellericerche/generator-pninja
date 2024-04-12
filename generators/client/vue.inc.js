const createVueClient = (that) => {
    that.fs.copyTpl(that.templatePath("vue/package.json"), that.destinationPath("client/package.json"));
    that.fs.copyTpl(that.templatePath("vue/package-lock.json"), that.destinationPath("client/package-lock.json"));
    that.fs.copyTpl(that.templatePath("vue/vite.config.js"), that.destinationPath("client/vite.config.js"));
    that.fs.copyTpl(that.templatePath("vue/.env.example"), that.destinationPath("client/.env.example"));
    that.fs.copyTpl(that.templatePath("vue/index.html"), that.destinationPath("client/index.html"));

    that.fs.copyTpl(that.templatePath("vue/public/presto-p.svg"), that.destinationPath("client/public/presto-p.svg"));
    if(that.config.get('authentication') === 'keycloak') {
        that.fs.copyTpl(that.templatePath("vue/public/keycloak.json.example"), that.destinationPath("client/public/keycloak.json"));
    }

    that.fs.copyTpl(that.templatePath("vue/src/App.vue"), that.destinationPath("client/src/App.vue"));
    that.fs.copyTpl(that.templatePath("vue/src/main.js"), that.destinationPath("client/src/main.js"));
    
    that.fs.copyTpl(that.templatePath("vue/src/components/Home.vue"), that.destinationPath("client/src/components/Home.vue"));
    that.fs.copyTpl(that.templatePath("vue/src/components/NavBar.vue"), that.destinationPath("client/src/components/NavBar.vue"));
    
    that.fs.copyTpl(that.templatePath("vue/src/plugins/authStore.js"), that.destinationPath("client/src/plugins/authStore.js"));
    
    that.fs.copyTpl(that.templatePath("vue/src/router/index.js"), that.destinationPath("client/src/router/index.js"));
    
    that.fs.copyTpl(that.templatePath("vue/src/scss/styles.scss"), that.destinationPath("client/src/scss/styles.scss"));
    
    that.fs.copyTpl(that.templatePath("vue/src/services/api.js"), that.destinationPath("client/src/services/api.js"));
    that.fs.copyTpl(that.templatePath("vue/src/services/keycloak.js"), that.destinationPath("client/src/services/keycloak.js"));
    that.fs.copyTpl(that.templatePath("vue/src/services/tokenInterceptors.js"), that.destinationPath("client/src/services/tokenInterceptors.js"));
    
    that.fs.copyTpl(that.templatePath("vue/src/stores/authStore.js"), that.destinationPath("client/src/stores/authStore.js"));

    that.fs.copyTpl(that.templatePath("vue/src/assets/pinia.svg"), that.destinationPath("client/src/assets/pinia.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/presto-p.svg"), that.destinationPath("client/src/assets/presto-p.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/vite.svg"), that.destinationPath("client/src/assets/vite.svg"));
    that.fs.copyTpl(that.templatePath("vue/src/assets/vue.svg"), that.destinationPath("client/src/assets/vue.svg"));
}
module.exports = { createVueClient }