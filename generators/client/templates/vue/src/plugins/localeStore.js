import { useLocaleStore } from "@/stores/localeStore.js";
const localeStorePlugin = {
  install(app, option) {
    const store = useLocaleStore(option.pinia);

    // Global localeStore
    app.config.globalProperties.$localeStore = store;
  }
}

export default localeStorePlugin;
