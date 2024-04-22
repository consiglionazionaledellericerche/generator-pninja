import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from './router';
import keycloakService from '@services/keycloak';
import AuthStorePlugin from './plugins/authStore';
import LocaleStorePlugin from './plugins/localeStore';
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import './scss/styles.scss'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Create Pinia instance
const pinia = createPinia();

// Use persisted state with Pinia so our store data will persist even after page refresh
pinia.use(piniaPluginPersistedstate);

const renderApp = () => {
  const app = createApp(App);
  app.use(pinia);
  app.use(AuthStorePlugin, { pinia });
  app.use(LocaleStorePlugin, { pinia });
  const i18n = createI18n({
    locale: app.config.globalProperties.$localeStore.selected || navigator.language,
    fallbackLocale: "en",
    messages,
    legacy: false
  });
  app.use(i18n);
  app.use(router);
  app.mount('#app');
}

// renderApp();

// Call keycloak service to init on render
keycloakService.CallInit(renderApp);