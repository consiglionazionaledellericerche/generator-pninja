import { defineStore } from "pinia";

export const useLocaleStore = defineStore({
  id: "localeStore",
  state: () => {
    return {
      selected: 'en-EN',
    }
  },
  persist: true,
  getters: {},
  actions: {
    setSelected(l) {
      this.selected = l;
    },
  }
});
